import os
import random
import math

from PIL import Image
from torch.utils.data import DataLoader, Dataset, Sampler
from torchvision import transforms


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def read_data(root_path, train_ratio=0.70, val_ratio=0.15, seed=42):
    class_names = sorted(
        name
        for name in os.listdir(root_path)
        if os.path.isdir(os.path.join(root_path, name))
    )

    if len(class_names) < 3:
        raise ValueError("Dataset phai co it nhat 3 nguoi de chia train/val/test.")

    shuffled_class_names = class_names.copy()
    random.Random(seed).shuffle(shuffled_class_names)

    number_of_classes = len(shuffled_class_names)
    number_of_train_classes = round(number_of_classes * train_ratio)
    number_of_val_classes = round(number_of_classes * val_ratio)
    val_end = number_of_train_classes + number_of_val_classes

    split_class_names = {
        "train": shuffled_class_names[:number_of_train_classes],
        "val": shuffled_class_names[number_of_train_classes:val_end],
        "test": shuffled_class_names[val_end:],
    }
    class_to_label = {
        class_name: label
        for label, class_name in enumerate(class_names)
    }

    def collect_images(selected_class_names):
        image_paths = []
        labels = []

        for class_name in selected_class_names:
            class_path = os.path.join(root_path, class_name)
            class_image_paths = [
                os.path.join(class_path, image_name)
                for image_name in sorted(os.listdir(class_path))
                if os.path.splitext(image_name)[1].lower() in IMAGE_EXTENSIONS
            ]

            if len(class_image_paths) < 2:
                raise ValueError(f"{class_name} can it nhat 2 anh.")

            label = class_to_label[class_name]
            image_paths.extend(class_image_paths)
            labels.extend([label] * len(class_image_paths))

        return image_paths, labels

    splits = {
        split_name: collect_images(selected_class_names)
        for split_name, selected_class_names in split_class_names.items()
    }
    return splits, class_names, split_class_names


class FaceImageDataset(Dataset):
    def __init__(self, image_paths, labels, transform=None):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, index):
        image = Image.open(self.image_paths[index]).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, self.labels[index]


class PKBatchSampler(Sampler):
    """Samples P identities and K images per identity for online mining."""

    def __init__(
        self,
        labels,
        identities_per_batch,
        images_per_identity,
        seed,
        change_each_epoch,
    ):
        self.labels = labels
        self.identities_per_batch = identities_per_batch
        self.images_per_identity = images_per_identity
        self.seed = seed
        self.change_each_epoch = change_each_epoch
        self.epoch = 0
        self.label_to_indices = {}

        for index, label in enumerate(labels):
            self.label_to_indices.setdefault(label, []).append(index)

        self.unique_labels = list(self.label_to_indices)
        if len(self.unique_labels) < identities_per_batch:
            raise ValueError("Khong du identity de tao mot P x K batch.")
        self.number_of_batches = math.ceil(
            len(labels) / (identities_per_batch * images_per_identity)
        )

    def __iter__(self):
        rng = random.Random(self.seed + self.epoch)
        if self.change_each_epoch:
            self.epoch += 1

        for _ in range(self.number_of_batches):
            selected_labels = rng.sample(
                self.unique_labels,
                self.identities_per_batch,
            )
            batch = []
            for label in selected_labels:
                indices = self.label_to_indices[label]
                if len(indices) >= self.images_per_identity:
                    batch.extend(rng.sample(indices, self.images_per_identity))
                else:
                    batch.extend(
                        rng.choices(indices, k=self.images_per_identity)
                    )
            rng.shuffle(batch)
            yield batch

    def __len__(self):
        return self.number_of_batches


def get_transforms(image_size):
    train_transform = transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=8),
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5] * 3, std=[0.5] * 3),
        ]
    )
    eval_transform = transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5] * 3, std=[0.5] * 3),
        ]
    )
    return train_transform, eval_transform


def build_dataloaders(cfg):
    splits, class_names, split_class_names = read_data(
        cfg.dataset_root,
        train_ratio=cfg.train_ratio,
        val_ratio=cfg.val_ratio,
        seed=cfg.seed,
    )
    X_train, y_train = splits["train"]
    X_val, y_val = splits["val"]
    X_test, y_test = splits["test"]
    train_transform, eval_transform = get_transforms(cfg.image_size)

    train_images = FaceImageDataset(X_train, y_train, train_transform)
    val_images_for_mining = FaceImageDataset(X_val, y_val, eval_transform)
    val_images = FaceImageDataset(X_val, y_val, eval_transform)
    test_images = FaceImageDataset(X_test, y_test, eval_transform)

    loader_options = {
        "num_workers": cfg.num_workers,
        "pin_memory": True,
    }
    train_batch_sampler = PKBatchSampler(
        y_train,
        cfg.identities_per_batch,
        cfg.images_per_identity,
        cfg.seed,
        change_each_epoch=True,
    )
    val_batch_sampler = PKBatchSampler(
        y_val,
        cfg.identities_per_batch,
        cfg.images_per_identity,
        cfg.seed + 10000,
        change_each_epoch=False,
    )
    loaders = {
        "train_triplet": DataLoader(
            train_images,
            batch_sampler=train_batch_sampler,
            **loader_options,
        ),
        "val_triplet": DataLoader(
            val_images_for_mining,
            batch_sampler=val_batch_sampler,
            **loader_options,
        ),
        "val_images": DataLoader(
            val_images,
            batch_size=cfg.batch_size,
            shuffle=False,
            **loader_options,
        ),
        "test_images": DataLoader(
            test_images,
            batch_size=cfg.batch_size,
            shuffle=False,
            **loader_options,
        ),
    }
    return loaders, class_names, split_class_names


if __name__ == "__main__":
    from config import get_parser

    cfg = get_parser()
    loaders, class_names, split_class_names = build_dataloaders(cfg)
    images, labels = next(iter(loaders["train_triplet"]))

    print(f"Number of classes: {len(class_names)}")
    print(
        "Identity split: "
        f"{len(split_class_names['train'])}/"
        f"{len(split_class_names['val'])}/"
        f"{len(split_class_names['test'])}"
    )
    print(f"PK batch images: {images.shape}")
    print(f"PK batch labels: {labels.shape}")
    print(f"Unique labels in batch: {labels.unique().tolist()}")

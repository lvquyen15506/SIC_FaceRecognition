import os
import random
from collections import defaultdict

from PIL import Image
from torch.utils.data import DataLoader, Dataset
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


class TripletFaceDataset(Dataset):
    def __init__(self, image_paths, labels, transform=None, seed=None):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform
        self.seed = seed
        self.label_to_indices = defaultdict(list)

        for index, label in enumerate(labels):
            self.label_to_indices[label].append(index)

        self.unique_labels = list(self.label_to_indices.keys())

        if len(self.unique_labels) < 2:
            raise ValueError("Triplet dataset phai co it nhat 2 nguoi.")

        for label, indices in self.label_to_indices.items():
            if len(indices) < 2:
                raise ValueError(
                    f"Label {label} phai co it nhat 2 anh de tao positive."
                )

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, index):
        rng = random if self.seed is None else random.Random(self.seed + index)
        anchor_label = self.labels[index]

        positive_candidates = [
            candidate_index
            for candidate_index in self.label_to_indices[anchor_label]
            if candidate_index != index
        ]
        positive_index = rng.choice(positive_candidates)

        negative_labels = [
            label
            for label in self.unique_labels
            if label != anchor_label
        ]
        negative_label = rng.choice(negative_labels)
        negative_index = rng.choice(self.label_to_indices[negative_label])

        anchor = self._load_image(self.image_paths[index])
        positive = self._load_image(self.image_paths[positive_index])
        negative = self._load_image(self.image_paths[negative_index])
        return anchor, positive, negative

    def _load_image(self, image_path):
        image = Image.open(image_path).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image


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

    train_triplets = TripletFaceDataset(
        X_train,
        y_train,
        transform=train_transform,
        seed=None,
    )
    val_triplets = TripletFaceDataset(
        X_val,
        y_val,
        transform=eval_transform,
        seed=cfg.seed,
    )
    val_images = FaceImageDataset(X_val, y_val, eval_transform)
    test_images = FaceImageDataset(X_test, y_test, eval_transform)

    loader_options = {
        "batch_size": cfg.batch_size,
        "num_workers": cfg.num_workers,
        "pin_memory": True,
    }
    loaders = {
        "train_triplet": DataLoader(train_triplets, shuffle=True, **loader_options),
        "val_triplet": DataLoader(val_triplets, shuffle=False, **loader_options),
        "val_images": DataLoader(val_images, shuffle=False, **loader_options),
        "test_images": DataLoader(test_images, shuffle=False, **loader_options),
    }
    return loaders, class_names, split_class_names


if __name__ == "__main__":
    from config import get_parser

    cfg = get_parser()
    loaders, class_names, split_class_names = build_dataloaders(cfg)
    anchors, positives, negatives = next(iter(loaders["train_triplet"]))

    print(f"Number of classes: {len(class_names)}")
    print(
        "Identity split: "
        f"{len(split_class_names['train'])}/"
        f"{len(split_class_names['val'])}/"
        f"{len(split_class_names['test'])}"
    )
    print(f"Anchor batch: {anchors.shape}")
    print(f"Positive batch: {positives.shape}")
    print(f"Negative batch: {negatives.shape}")

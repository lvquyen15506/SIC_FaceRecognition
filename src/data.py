import os
import random

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

    if len(class_names) < 2:
        raise ValueError("Dataset phai co it nhat 2 nguoi.")

    X_train, y_train = [], []
    X_val, y_val = [], []
    X_test, y_test = [], []
    rng = random.Random(seed)

    for label, class_name in enumerate(class_names):
        class_path = os.path.join(root_path, class_name)
        image_paths = [
            os.path.join(class_path, image_name)
            for image_name in os.listdir(class_path)
            if os.path.splitext(image_name)[1].lower() in IMAGE_EXTENSIONS
        ]

        if len(image_paths) < 3:
            raise ValueError(f"{class_name} can it nhat 3 anh.")

        rng.shuffle(image_paths)
        number_of_images = len(image_paths)
        train_end = max(1, int(number_of_images * train_ratio))
        val_end = train_end + max(1, int(number_of_images * val_ratio))

        if val_end >= number_of_images:
            val_end = number_of_images - 1
            train_end = min(train_end, val_end - 1)

        X_train.extend(image_paths[:train_end])
        y_train.extend([label] * len(image_paths[:train_end]))
        X_val.extend(image_paths[train_end:val_end])
        y_val.extend([label] * len(image_paths[train_end:val_end]))
        X_test.extend(image_paths[val_end:])
        y_test.extend([label] * len(image_paths[val_end:]))

    return X_train, y_train, X_val, y_val, X_test, y_test, class_names


class ImageDataset(Dataset):
    def __init__(self, image_paths, labels, transform=None):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, index):
        image_path = self.image_paths[index]
        label = self.labels[index]
        image = Image.open(image_path).convert("RGB")

        if self.transform:
            image = self.transform(image)

        return image, label


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
    data = read_data(
        cfg.dataset_root,
        train_ratio=cfg.train_ratio,
        val_ratio=cfg.val_ratio,
        seed=cfg.seed,
    )
    X_train, y_train, X_val, y_val, X_test, y_test, class_names = data
    train_transform, eval_transform = get_transforms(cfg.image_size)

    train_dataset = ImageDataset(X_train, y_train, train_transform)
    val_dataset = ImageDataset(X_val, y_val, eval_transform)
    test_dataset = ImageDataset(X_test, y_test, eval_transform)

    train_loader = DataLoader(
        train_dataset,
        batch_size=cfg.batch_size,
        shuffle=True,
        num_workers=cfg.num_workers,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=cfg.batch_size,
        shuffle=False,
        num_workers=cfg.num_workers,
    )
    test_loader = DataLoader(
        test_dataset,
        batch_size=cfg.batch_size,
        shuffle=False,
        num_workers=cfg.num_workers,
    )

    return train_loader, val_loader, test_loader, class_names


if __name__ == "__main__":
    from config import get_parser

    cfg = get_parser()
    train_loader, val_loader, test_loader, class_names = build_dataloaders(cfg)
    images, labels = next(iter(train_loader))

    print(f"Number of classes: {len(class_names)}")
    print(f"Train images: {len(train_loader.dataset)}")
    print(f"Validation images: {len(val_loader.dataset)}")
    print(f"Test images: {len(test_loader.dataset)}")
    print(f"Image batch shape: {images.shape}")
    print(f"Label batch shape: {labels.shape}")

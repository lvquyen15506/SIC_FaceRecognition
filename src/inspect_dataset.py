import argparse
from collections import Counter
from pathlib import Path

from PIL import Image


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def inspect_dataset(root: Path, verify_images: bool) -> None:
    if not root.exists():
        raise FileNotFoundError(f"Khong tim thay dataset: {root.resolve()}")

    class_dirs = sorted(path for path in root.iterdir() if path.is_dir())
    if not class_dirs:
        raise ValueError("Dataset phai co cac thu muc con, moi thu muc la mot nguoi.")

    counts: Counter[str] = Counter()
    broken_images: list[Path] = []

    for class_dir in class_dirs:
        image_paths = [
            path
            for path in class_dir.rglob("*")
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        ]
        counts[class_dir.name] = len(image_paths)

        if verify_images:
            for image_path in image_paths:
                try:
                    with Image.open(image_path) as image:
                        image.verify()
                except (OSError, ValueError):
                    broken_images.append(image_path)

    total_images = sum(counts.values())
    sorted_counts = counts.most_common()

    print(f"So danh tinh (classes): {len(counts)}")
    print(f"Tong so anh: {total_images}")
    print(f"Trung binh anh/nguoi: {total_images / len(counts):.2f}")
    print(f"It nhat: {min(counts.values())} anh")
    print(f"Nhieu nhat: {max(counts.values())} anh")

    print("\n5 nguoi co nhieu anh nhat:")
    for name, count in sorted_counts[:5]:
        print(f"  {name}: {count}")

    print("\n5 nguoi co it anh nhat:")
    for name, count in sorted(counts.items(), key=lambda item: item[1])[:5]:
        print(f"  {name}: {count}")

    if verify_images:
        print(f"\nSo anh loi: {len(broken_images)}")
        for image_path in broken_images[:10]:
            print(f"  {image_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Khao sat dataset khuon mat")
    parser.add_argument("--root", type=Path, required=True, help="Thu muc dataset")
    parser.add_argument(
        "--verify-images",
        action="store_true",
        help="Mo va kiem tra tung anh; cham hon nhung phat hien file loi",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    inspect_dataset(args.root, args.verify_images)


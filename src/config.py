import argparse


def get_parser():
    parser = argparse.ArgumentParser(
        description="Custom Vision Transformer for Face Recognition"
    )

    parser.add_argument("--experiment_name", type=str, default="sic_vit_4")
    parser.add_argument("--dataset_root", type=str, default="dataset")
    parser.add_argument("--image_size", type=int, default=112)
    parser.add_argument("--train_ratio", type=float, default=0.70)
    parser.add_argument("--val_ratio", type=float, default=0.15)
    parser.add_argument("--test_ratio", type=float, default=0.15)

    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--num_workers", type=int, default=0)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--weight_decay", type=float, default=1e-4)
    parser.add_argument("--epochs", type=int, default=300)
    parser.add_argument("--early_stop", type=int, default=10)
    parser.add_argument("--seed", type=int, default=42)

    parser.add_argument("--patch_size", type=int, default=16)
    parser.add_argument("--embed_dim", type=int, default=192)
    parser.add_argument("--depth", type=int, default=4)
    parser.add_argument("--num_heads", type=int, default=3)
    parser.add_argument("--mlp_ratio", type=float, default=2.0)
    parser.add_argument("--dropout", type=float, default=0.1)

    cfg = parser.parse_args()

    ratio_sum = cfg.train_ratio + cfg.val_ratio + cfg.test_ratio
    if abs(ratio_sum - 1.0) > 1e-6:
        parser.error("train_ratio + val_ratio + test_ratio phai bang 1")
    if cfg.image_size % cfg.patch_size != 0:
        parser.error("image_size phai chia het cho patch_size")

    return cfg


if __name__ == "__main__":
    print(get_parser())

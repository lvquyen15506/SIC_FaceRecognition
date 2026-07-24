import os
import random
import time

import torch
from torch import nn

from config import get_parser
from data import build_dataloaders
from model import build_model
from visualization import plot_training_history, save_history


def format_time(seconds):
    hours, remainder = divmod(int(seconds), 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def set_seed(seed):
    random.seed(seed)
    torch.manual_seed(seed)

    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


def get_device():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    return device


def train_one_epoch(model, train_loader, criterion, optimizer, device):
    model.train()

    total_loss = 0.0
    total_correct = 0
    total_samples = 0

    for images, labels in train_loader:
        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        logits = model(images)
        loss = criterion(logits, labels)

        loss.backward()
        optimizer.step()

        batch_size = labels.size(0)
        total_loss += loss.item() * batch_size

        predictions = logits.argmax(dim=1)
        total_correct += (predictions == labels).sum().item()
        total_samples += batch_size

    average_loss = total_loss / total_samples
    accuracy = total_correct / total_samples
    return average_loss, accuracy


def evaluate(model, data_loader, criterion, device):
    model.eval()

    total_loss = 0.0
    total_correct = 0
    total_samples = 0

    with torch.no_grad():
        for images, labels in data_loader:
            images = images.to(device)
            labels = labels.to(device)

            logits = model(images)
            loss = criterion(logits, labels)

            batch_size = labels.size(0)
            total_loss += loss.item() * batch_size

            predictions = logits.argmax(dim=1)
            total_correct += (predictions == labels).sum().item()
            total_samples += batch_size

    average_loss = total_loss / total_samples
    accuracy = total_correct / total_samples
    return average_loss, accuracy


def main():
    cfg = get_parser()
    set_seed(cfg.seed)
    device = get_device()

    train_loader, val_loader, test_loader, class_names = build_dataloaders(cfg)

    model = build_model(len(class_names), cfg)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=cfg.lr,
        weight_decay=cfg.weight_decay,
    )

    os.makedirs("checkpoints", exist_ok=True)
    best_model_path = os.path.join(
        "checkpoints",
        f"{cfg.experiment_name}_best.pth",
    )

    best_val_loss = float("inf")
    epochs_without_improvement = 0
    history = {
        "train_loss": [],
        "train_accuracy": [],
        "val_loss": [],
        "val_accuracy": [],
        "epoch_time": [],
    }

    training_start_time = time.perf_counter()

    for epoch in range(cfg.epochs):
        epoch_start_time = time.perf_counter()

        train_loss, train_accuracy = train_one_epoch(
            model,
            train_loader,
            criterion,
            optimizer,
            device,
        )

        val_loss, val_accuracy = evaluate(
            model,
            val_loader,
            criterion,
            device,
        )

        epoch_time = time.perf_counter() - epoch_start_time

        print(
            f"Epoch [{epoch + 1}/{cfg.epochs}] "
            f"Train Loss={train_loss:.4f} "
            f"Train Acc={train_accuracy:.2%} "
            f"Val Loss={val_loss:.4f} "
            f"Val Acc={val_accuracy:.2%} "
            f"Time={format_time(epoch_time)}"
        )

        history["train_loss"].append(train_loss)
        history["train_accuracy"].append(train_accuracy)
        history["val_loss"].append(val_loss)
        history["val_accuracy"].append(val_accuracy)
        history["epoch_time"].append(epoch_time)

        save_history(history, cfg.experiment_name)
        plot_training_history(history, cfg.experiment_name)

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            epochs_without_improvement = 0

            torch.save(
                {
                    "epoch": epoch + 1,
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "val_loss": val_loss,
                    "class_names": class_names,
                },
                best_model_path,
            )
            print(f"Saved best model to: {best_model_path}")
        else:
            epochs_without_improvement += 1

        if epochs_without_improvement >= cfg.early_stop:
            print(f"Early stopping at epoch {epoch + 1}")
            break

    total_training_time = time.perf_counter() - training_start_time
    print(f"Total training time: {format_time(total_training_time)}")

    checkpoint = torch.load(best_model_path, map_location=device, weights_only=True)
    model.load_state_dict(checkpoint["model_state_dict"])

    test_loss, test_accuracy = evaluate(
        model,
        test_loader,
        criterion,
        device,
    )

    print(f"Best epoch: {checkpoint['epoch']}")
    print(f"Test Loss={test_loss:.4f} Test Acc={test_accuracy:.2%}")


if __name__ == "__main__":
    main()

import json
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


def get_experiment_dir(experiment_name):
    experiment_dir = os.path.join("outputs", experiment_name)
    os.makedirs(experiment_dir, exist_ok=True)
    return experiment_dir


def save_history(history, experiment_name):
    experiment_dir = get_experiment_dir(experiment_name)
    history_path = os.path.join(experiment_dir, "history.json")

    with open(history_path, "w", encoding="utf-8") as file:
        json.dump(history, file, indent=4)

    return history_path


def plot_training_history(history, experiment_name):
    experiment_dir = get_experiment_dir(experiment_name)
    figure_path = os.path.join(experiment_dir, "training_curves.png")
    epochs = range(1, len(history["train_loss"]) + 1)

    figure, axes = plt.subplots(1, 2, figsize=(12, 5))

    axes[0].plot(epochs, history["train_loss"], label="Train Loss")
    axes[0].plot(epochs, history["val_loss"], label="Validation Loss")
    axes[0].set_title(f"Loss - {experiment_name}")
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Loss")
    axes[0].grid(True, alpha=0.3)
    axes[0].legend()

    train_accuracy = [value * 100 for value in history["train_accuracy"]]
    val_accuracy = [value * 100 for value in history["val_accuracy"]]
    axes[1].plot(epochs, train_accuracy, label="Train Accuracy")
    axes[1].plot(epochs, val_accuracy, label="Validation Accuracy")
    axes[1].set_title(f"Accuracy - {experiment_name}")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("Accuracy (%)")
    axes[1].grid(True, alpha=0.3)
    axes[1].legend()

    figure.tight_layout()
    figure.savefig(figure_path, dpi=160)
    plt.close(figure)
    return figure_path

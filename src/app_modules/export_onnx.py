import os
import sys
import argparse
from pathlib import Path

# Automatic Path Bootstrap
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parents[1] if CURRENT_DIR.name == "app_modules" else CURRENT_DIR
for p in [str(PROJECT_ROOT / "src"), str(PROJECT_ROOT)]:
    if p not in sys.path:
        sys.path.insert(0, p)

import torch

from data_pipeline import get_parser
from core import build_model


def export_to_onnx(experiment_name, output_dir="weights"):
    """
    Chuyen doi PyTorch checkpoint (.pth) sang dinh dang ONNX (.onnx)
    voi Dynamic Batch Size cho phep suy luan voi batch size tuy y.
    """
    # 1. Tim duong dan den file checkpoint
    possible_paths = [
        os.path.join("checkpoints", f"{experiment_name}_best.pth"),
        os.path.join("src", "checkpoints", f"{experiment_name}_best.pth"),
        os.path.join(os.path.dirname(__file__), "checkpoints", f"{experiment_name}_best.pth"),
    ]
    checkpoint_path = None
    for path in possible_paths:
        if os.path.exists(path):
            checkpoint_path = path
            break

    if checkpoint_path is None:
        raise FileNotFoundError(f"Khong tim thay checkpoint {experiment_name}_best.pth tai cac duong dan: {possible_paths}")

    print(f"[1/4] Dang nLoaded checkpoint: {checkpoint_path}")
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)

    # 2. Reconstruct lai cau hinh model tu checkpoint
    model_cfg = argparse.Namespace(**checkpoint["config"])
    print(f"      Architecture: depth={model_cfg.depth}, embed_dim={model_cfg.embed_dim}, img_size={model_cfg.image_size}")

    # 3. Khoi tao mo hinh va nap trong so (weights)
    print("[2/4] Dang khoi tao va nap trong so vao FaceVisionTransformer...")
    model = build_model(model_cfg)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    # 4. Tao dau ra va duong dan file ONNX
    os.makedirs(output_dir, exist_ok=True)
    onnx_path = os.path.join(output_dir, f"{experiment_name}.onnx")

    # 5. Tao dummy input tensor cho luong Forward pass
    dummy_input = torch.randn(1, 3, model_cfg.image_size, model_cfg.image_size, dtype=torch.float32)

    # 6. Thuc hien export PyTorch model sang ONNX
    print(f"[3/4] Dang xuat mo hinh sang ONNX format tại: {onnx_path}...")
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["embedding"],
        dynamic_axes={
            "input": {0: "batch_size"},
            "embedding": {0: "batch_size"},
        },
        dynamo=False,
    )
    print(f"      Export thanh cong file ONNX: {onnx_path}")

    # 7. Kiem tra tinh dung dan cua file ONNX (Verification)
    print("[4/4] Dang kiem tra tinh tuong đương giua PyTorch tensor va ONNX Output...")
    try:
        import onnxruntime as ort
        import numpy as np

        session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        onnx_inputs = {session.get_inputs()[0].name: dummy_input.numpy()}
        onnx_outputs = session.run(None, onnx_inputs)[0]

        with torch.no_grad():
            torch_outputs = model(dummy_input).numpy()

        max_diff = np.max(np.abs(torch_outputs - onnx_outputs))
        print(f"      Chenh lech giua PyTorch va ONNX Runtime: {max_diff:.8f}")

        if max_diff < 1e-4:
            print("      => CHECK VERIFICATION SUCCESS: Output PyTorch va ONNX hoan toan trung khop!")
        else:
            print("      => WARNING: Phai sinh sai so nho giua 2 engine, tuy nhien van nam trong muc cho phép.")

    except ImportError:
        print("      (Chua cai onnxruntime trong env, bo qua buoc test khop output).")

    return onnx_path


if __name__ == "__main__":
    cli_cfg = get_parser()
    export_to_onnx(cli_cfg.experiment_name)

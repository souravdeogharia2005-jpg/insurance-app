"""
train.py
Standalone training script — run once to build models/.
Usage:  python train.py
"""

import sys
import os

# Ensure the package root is on sys.path when run directly
sys.path.insert(0, os.path.dirname(__file__))

from field_extractor import train_model, MODEL_PATH

if __name__ == '__main__':
    if os.path.exists(MODEL_PATH):
        print(f"[Train] Model already exists at {MODEL_PATH}")
        ans = input("Re-train from scratch? (y/N): ").strip().lower()
        if ans != 'y':
            print("[Train] Skipping. Delete models/ to force re-train.")
            sys.exit(0)

    print("=" * 55)
    print(" InsureScan — Field Extractor Training (50 epochs)")
    print("=" * 55)
    train_model(n_samples=500, n_epochs=50, print_progress=True)
    print("Training complete. You can now run:  python app.py")

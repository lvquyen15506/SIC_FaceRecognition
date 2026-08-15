import os
import torch
import numpy as np


class GalleryManager:
    """
    Quan ly tap anh/vector dang ky (Gallery Database) va thuc hien
    truy van nhan dien khuôn mat (Identification) kem phat hien Nguoi la (Unknown).
    """

    def __init__(self, threshold=0.42, db_path="gallery_db.pt"):
        """
        Khoi tao GalleryManager.
        :param threshold: Nguong khoang cach L2 Can bang Vang (mac dinh 0.42 cho do nhan dien cao)
        :param db_path: Duong dan den tệp luu tru database gallery
        """
        self.threshold = threshold
        self.db_path = db_path
        self.gallery_embeddings = []  # Danh sach tensor [128]
        self.gallery_names = []       # Danh sach ten tuong ung ["NguyenVanA", "TranThiB", ...]

        # Nap database neu da ton tai tren dia
        self.load_db()

    def add_identity(self, name, embedding):
        """
        Dang ky mot danh tinh moi hoac them anh moi cho danh tinh da co.
        :param name: Ten nguoi dang ky (str)
        :param embedding: Tensor 1D [128] hoac 2D [1, 128] hoac numpy array
        """
        if isinstance(embedding, np.ndarray):
            embedding = torch.from_numpy(embedding)

        if embedding.ndim == 2:
            embedding = embedding.squeeze(0)

        # Chuon hoa L2 vector ve chieu dai unit
        embedding = embedding / torch.linalg.vector_norm(embedding, ord=2)

        self.gallery_embeddings.append(embedding.cpu())
        self.gallery_names.append(name)
        print(f"[Gallery] Da dang ky thanh cong nhan dang: '{name}' (Tong cong: {len(self.gallery_names)} anh trong gallery)")

    def _resolve_db_path(self, target_path):
        if target_path and os.path.exists(target_path):
            return target_path
        candidates = [
            target_path,
            os.path.join("data_gallery", "gallery_db.pt"),
            os.path.join("src", "data_gallery", "gallery_db.pt"),
            "gallery_db.pt",
        ]
        for c in candidates:
            if c and os.path.exists(c):
                return c
        return target_path if target_path else os.path.join("data_gallery", "gallery_db.pt")

    def save_db(self, custom_path=None):
        """Luu danh sach vector dang ky ra file .pt"""
        raw_path = custom_path if custom_path else self.db_path
        save_path = self._resolve_db_path(raw_path)
        
        parent_dir = os.path.dirname(save_path)
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)

        if len(self.gallery_embeddings) == 0:
            print("[Gallery] Gallery rông, khong co du lieu de luu.")
            return

        stacked_embeddings = torch.stack(self.gallery_embeddings, dim=0)
        data = {
            "embeddings": stacked_embeddings,
            "names": self.gallery_names,
            "threshold": self.threshold,
        }
        torch.save(data, save_path)
        print(f"[Gallery] Da luu database gallery gồm {len(self.gallery_names)} mau vao: {save_path}")

    def clear_db(self, custom_path=None):
        """Xoa sach du lieu gallery hien tai"""
        raw_path = custom_path if custom_path else self.db_path
        save_path = self._resolve_db_path(raw_path)
        self.gallery_embeddings = []
        self.gallery_names = []
        if os.path.exists(save_path):
            os.remove(save_path)
            print(f"[Gallery] Da xoa sach database gallery tai: {save_path}")
        else:
            print("[Gallery] Database gallery hien dang rông.")

    def load_db(self, custom_path=None):
        """Nap database gallery tu file .pt"""
        raw_path = custom_path if custom_path else self.db_path
        load_path = self._resolve_db_path(raw_path)
        if not os.path.exists(load_path):
            print(f"[Gallery] Chua co database cu tại {load_path}. Khoi tao gallery rông.")
            return False

        data = torch.load(load_path, map_location="cpu", weights_only=False)
        embeddings_tensor = data["embeddings"]
        self.gallery_names = data["names"]
        self.gallery_embeddings = [embeddings_tensor[i] for i in range(len(self.gallery_names))]
        print(f"[Gallery] Nap thanh cong {len(self.gallery_names)} mau gallery tu: {load_path}")
        return True

    def get_registered_names(self):
        """Tra ve danh sach cac danh tinh (ten) doc nhat da dang ky trong Gallery"""
        return list(dict.fromkeys(self.gallery_names))

    def identify(self, query_embedding):
        """
        Truy van vector khuon mat query dung Hybrid Matching (Mau don le + Vector Trung Tam Centroid).
        :param query_embedding: Tensor [128] hoac [1, 128]
        :return: dict(name, distance, confidence, is_known)
        """
        if len(self.gallery_embeddings) == 0:
            return {
                "name": "Unknown",
                "distance": 999.0,
                "confidence": 0.0,
                "is_known": False,
            }

        if isinstance(query_embedding, np.ndarray):
            query_embedding = torch.from_numpy(query_embedding)

        if query_embedding.ndim == 2:
            query_embedding = query_embedding.squeeze(0)

        # Chuon hoa L2 vector query
        query_embedding = query_embedding / torch.linalg.vector_norm(query_embedding, ord=2)

        # Gom toan bo gallery embeddings thanh matrix [N, 128]
        gallery_matrix = torch.stack(self.gallery_embeddings, dim=0)

        # Hybrid Robust Multi-Pose Matching: Hop nhat Vector Trung Tam (Centroid) va Top-5 Mau Cung Tu The
        unique_names = list(dict.fromkeys(self.gallery_names))
        user_distances = []

        for u_name in unique_names:
            idxs = [i for i, n in enumerate(self.gallery_names) if n == u_name]
            user_matrix = gallery_matrix[idxs]
            
            # 1. Khoang cach toi Vector Trung Tam Toan Dien (Global Centroid)
            user_centroid = user_matrix.mean(dim=0)
            user_centroid = user_centroid / torch.linalg.vector_norm(user_centroid, ord=2)
            d_centroid = torch.linalg.vector_norm(user_centroid - query_embedding, ord=2).item()

            # 2. Khoang cach Trung binh Top-5 mau trung khop nhat cua tư the hien tai (Top-5 Pose Cluster)
            d_samples = torch.linalg.vector_norm(user_matrix - query_embedding, ord=2, dim=1)
            k = min(5, len(user_matrix))
            d_top5 = torch.topk(d_samples, k=k, largest=False).values.mean().item()

            # Ket hop Hybrid: Trung binh trong so giua Centroid toan dien va Top-5 cum tư the
            d_hybrid = 0.4 * d_centroid + 0.6 * d_top5
            user_distances.append(d_hybrid)

        user_distances = torch.tensor(user_distances)
        min_distance, min_index = torch.min(user_distances, dim=0)
        min_distance = min_distance.item()
        matched_name = unique_names[min_index.item()]

        # Tinh diem tin cay Confidence Score (%) muot ma theo duong cong sinh trac hoc
        if min_distance <= self.threshold:
            ratio = 1.0 - (min_distance / self.threshold)
            confidence = 50.0 + 50.0 * (ratio ** 0.35)
        else:
            ratio = (min_distance - self.threshold) / (2.0 - self.threshold)
            confidence = max(0.0, 50.0 * (1.0 - min(1.0, ratio)))

        confidence = max(0.0, min(99.9, confidence))

        # Phân loai Known vs Unknown dua tren nguong 0.60
        is_known = min_distance <= self.threshold
        final_name = matched_name if is_known else "Unknown"

        return {
            "name": final_name,
            "matched_gallery_name": matched_name,
            "distance": min_distance,
            "confidence": confidence,
            "is_known": is_known,
        }


if __name__ == "__main__":
    # Test Sanity Check cho Module GalleryManager
    print("=== TESTING GALLERY MANAGER MODULE ===")
    manager = GalleryManager(threshold=0.7641, db_path="test_gallery.pt")

    # 1. Gia lap dang ky 2 nguoi
    emb_user_a1 = torch.randn(128)
    emb_user_a2 = emb_user_a1 + torch.randn(128) * 0.1  # Anh thu 2 cua User A (khoang cach nho)
    emb_user_b = torch.randn(128)                       # User B (khac hoàn toan)

    manager.add_identity("NguyenVanA", emb_user_a1)
    manager.add_identity("TranThiB", emb_user_b)
    manager.save_db()

    # 2. Test nhan dien nguoi quen (User A)
    result_a = manager.identify(emb_user_a2)
    print("Test User A (Expected Known):", result_a)

    # 3. Test nhan dien nguoi la (Random Embedding)
    random_stranger_emb = torch.randn(128)
    result_stranger = manager.identify(random_stranger_emb)
    print("Test Stranger (Expected Unknown):", result_stranger)

    # Dọn dẹp tệp test
    if os.path.exists("test_gallery.pt"):
        os.remove("test_gallery.pt")

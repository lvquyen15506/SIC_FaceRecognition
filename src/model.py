import torch
from torch import nn


class PatchEmbedding(nn.Module):
    def __init__(self, image_size, patch_size, in_channels, embed_dim):
        super().__init__()
        self.number_of_patches = (image_size // patch_size) ** 2
        self.projection = nn.Conv2d(
            in_channels=in_channels,
            out_channels=embed_dim,
            kernel_size=patch_size,
            stride=patch_size,
        )

    def forward(self, images):
        patches = self.projection(images)
        patches = patches.flatten(start_dim=2)
        patches = patches.transpose(1, 2)
        return patches


class FeedForward(nn.Module):
    def __init__(self, embed_dim, hidden_dim, dropout):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(embed_dim, hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, embed_dim),
            nn.Dropout(dropout),
        )

    def forward(self, x):
        return self.layers(x)


class TransformerEncoderBlock(nn.Module):
    def __init__(self, embed_dim, num_heads, mlp_ratio, dropout):
        super().__init__()
        hidden_dim = int(embed_dim * mlp_ratio)

        self.norm_attention = nn.LayerNorm(embed_dim)
        self.attention = nn.MultiheadAttention(
            embed_dim=embed_dim,
            num_heads=num_heads,
            dropout=dropout,
            batch_first=True,
        )
        self.norm_mlp = nn.LayerNorm(embed_dim)
        self.mlp = FeedForward(embed_dim, hidden_dim, dropout)

    def forward(self, x):
        normalized_x = self.norm_attention(x)
        attention_output, _ = self.attention(
            normalized_x,
            normalized_x,
            normalized_x,
            need_weights=False,
        )
        x = x + attention_output
        x = x + self.mlp(self.norm_mlp(x))
        return x


class VisionTransformer(nn.Module):
    def __init__(
        self,
        num_classes,
        image_size=112,
        patch_size=16,
        in_channels=3,
        embed_dim=192,
        depth=4,
        num_heads=3,
        mlp_ratio=2.0,
        dropout=0.1,
    ):
        super().__init__()

        self.patch_embedding = PatchEmbedding(
            image_size,
            patch_size,
            in_channels,
            embed_dim,
        )
        number_of_patches = self.patch_embedding.number_of_patches

        self.class_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.position_embedding = nn.Parameter(
            torch.zeros(1, number_of_patches + 1, embed_dim)
        )
        self.embedding_dropout = nn.Dropout(dropout)

        self.encoder_blocks = nn.Sequential(
            *[
                TransformerEncoderBlock(
                    embed_dim,
                    num_heads,
                    mlp_ratio,
                    dropout,
                )
                for _ in range(depth)
            ]
        )

        self.final_norm = nn.LayerNorm(embed_dim)
        self.classifier = nn.Linear(embed_dim, num_classes)

        nn.init.trunc_normal_(self.class_token, std=0.02)
        nn.init.trunc_normal_(self.position_embedding, std=0.02)

    def forward(self, images):
        patch_tokens = self.patch_embedding(images)
        batch_size = patch_tokens.shape[0]

        class_tokens = self.class_token.expand(batch_size, -1, -1)
        tokens = torch.cat((class_tokens, patch_tokens), dim=1)
        tokens = tokens + self.position_embedding
        tokens = self.embedding_dropout(tokens)

        tokens = self.encoder_blocks(tokens)
        tokens = self.final_norm(tokens)

        class_features = tokens[:, 0]
        logits = self.classifier(class_features)
        return logits


def build_model(number_of_classes, cfg):
    return VisionTransformer(
        num_classes=number_of_classes,
        image_size=cfg.image_size,
        patch_size=cfg.patch_size,
        embed_dim=cfg.embed_dim,
        depth=cfg.depth,
        num_heads=cfg.num_heads,
        mlp_ratio=cfg.mlp_ratio,
        dropout=cfg.dropout,
    )


if __name__ == "__main__":
    from config import get_parser
    from data import build_dataloaders

    cfg = get_parser()
    train_loader, _, _, class_names = build_dataloaders(cfg)
    images, labels = next(iter(train_loader))

    model = build_model(len(class_names), cfg)
    logits = model(images)

    total_parameters = sum(parameter.numel() for parameter in model.parameters())

    print(f"Input image shape: {images.shape}")
    print(f"Label shape: {labels.shape}")
    print(f"Number of classes: {len(class_names)}")
    print(f"Logits shape: {logits.shape}")
    print(f"Total parameters: {total_parameters:,}")

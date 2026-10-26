import type { ImagePickerAsset } from "expo-image-picker";

export async function appendProductImages(form: FormData, assets: ImagePickerAsset[], platform: string): Promise<void> {
  if (assets.length < 1 || assets.length > 5) throw new Error("Select between one and five product images.");
  for (const [index, asset] of assets.entries()) {
    const uriName = asset.uri.split(/[?#]/)[0].split("/").pop();
    const extension = (asset.fileName || uriName || "").split(".").pop()?.toLowerCase();
    const types: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif", gif: "image/gif", avif: "image/avif" };
    const type = asset.mimeType || types[extension || ""];
    if (platform === "web") {
      // Browser FormData requires a File/Blob, not a native URI descriptor.
      let file: Blob | undefined = asset.file;
      if (!file) {
        const response = await fetch(asset.uri);
        if (!response.ok) throw new Error("Could not read the selected image.");
        file = await response.blob();
      }
      const mime = file.type || type;
      if (!mime?.startsWith("image/")) throw new Error("Could not determine the image type.");
      const name = asset.file?.name || asset.fileName || `product-${index}.${mime.split("/")[1]}`;
      form.append("images", file.type ? file : file.slice(0, file.size, mime), name);
    } else {
      if (!asset.uri || !type?.startsWith("image/")) throw new Error("Could not determine the selected image URI or type.");
      const name = asset.fileName || uriName || `product-${index}.${type.split("/")[1]}`;
      // Native FormData supports URI parts, which DOM typings do not model.
      form.append("images", { uri: asset.uri, name, type } as unknown as Blob);
    }
  }
}

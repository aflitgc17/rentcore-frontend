export async function uploadToCloudinary(file: File) {
    const url = `https://api.cloudinary.com/v1_1/<YOUR_CLOUD_NAME>/upload`;
  
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "unsigned_upload"); // Cloudinary에서 만든 unsigned preset 이름
  
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });
  
    if (!res.ok) throw new Error("Cloudinary upload failed");
  
    const data = await res.json();
    return data.secure_url as string; // ✅ 업로드된 파일의 URL
  }
  
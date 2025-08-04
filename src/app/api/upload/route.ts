
import { NextResponse } from 'next/server';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, setMetadata } from 'firebase/storage';
import { storage } from '@/lib/firebase'; // Assuming you have firebase initialized here

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tags = formData.get('tags') as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const storageRef = ref(storage, `uploads/${file.name}`);
    
    const metadata = {
      contentType: file.type,
      customMetadata: {
        ...(tags && { tags: tags })
      }
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          // Optional: handle progress updates
        },
        (error) => {
          console.error("Upload error:", error);
          reject(NextResponse.json({ error: "Failed to upload file." }, { status: 500 }));
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const finalMetadata = await getMetadata(storageRef);
          
          const uploadedFileResponse = {
            name: finalMetadata.name,
            size: finalMetadata.size,
            type: finalMetadata.contentType || 'application/octet-stream',
            url: downloadURL,
            tags: finalMetadata.customMetadata?.tags ? JSON.parse(finalMetadata.customMetadata.tags) : [],
            fullPath: finalMetadata.fullPath,
            uploadedAt: finalMetadata.timeCreated,
          };

          resolve(NextResponse.json(uploadedFileResponse, { status: 200 }));
        }
      );
    });

  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

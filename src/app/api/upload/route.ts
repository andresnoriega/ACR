
import { NextResponse } from 'next/server';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const storageRef = ref(storage, `uploads/${Date.now()}-${file.name}`);
    
    // Convert the file to an ArrayBuffer before uploading
    const arrayBuffer = await file.arrayBuffer();
    const uploadResult = await uploadBytes(storageRef, arrayBuffer, {
        contentType: file.type,
    });
    
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    const finalMetadata = uploadResult.metadata;
          
    const uploadedFileResponse = {
      name: finalMetadata.name,
      size: finalMetadata.size,
      type: finalMetadata.contentType || 'application/octet-stream',
      url: downloadURL,
      tags: [], 
      fullPath: finalMetadata.fullPath,
      uploadedAt: finalMetadata.timeCreated,
    };

    return NextResponse.json(uploadedFileResponse, { status: 200 });

  } catch (error) {
    console.error("Server error in POST /api/upload:", error);
    // Provide a more descriptive error in development for easier debugging
    const errorMessage = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

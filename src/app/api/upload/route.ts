
import { NextResponse } from 'next/server';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    // Tags are not being sent from the client in this implementation, so we remove it.
    // const tags = formData.get('tags') as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Add a timestamp to the file name to prevent overwrites
    const storageRef = ref(storage, `uploads/${Date.now()}-${file.name}`);
    
    // We don't need to set metadata here, uploadBytes will infer content type.
    // Custom metadata can be added if needed in the future.
    const uploadResult = await uploadBytes(storageRef, file);
    
    // Get the download URL after the upload is complete
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    const finalMetadata = uploadResult.metadata;
          
    const uploadedFileResponse = {
      name: finalMetadata.name,
      size: finalMetadata.size,
      type: finalMetadata.contentType || 'application/octet-stream',
      url: downloadURL,
      // Tags are not being handled in this simplified version
      tags: [], 
      fullPath: finalMetadata.fullPath,
      uploadedAt: finalMetadata.timeCreated,
    };

    return NextResponse.json(uploadedFileResponse, { status: 200 });

  } catch (error) {
    console.error("Server error in POST /api/upload:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

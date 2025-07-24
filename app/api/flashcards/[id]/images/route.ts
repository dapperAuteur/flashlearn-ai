/* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// // app/api/flashcards/[id]/images/route.ts

import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth/next';
// import { ObjectId } from 'mongodb';
// import clientPromise from '@/lib/db/mongodb';
// import { Logger, LogContext } from '@/lib/logging/logger';
// import mongodb from '@/lib/db/mongodb';
// // import { Route } from 'next';
// const { Readable } = await import('stream')

// // type RouteParams = {
// //   id: string;
// // }
// interface RouteContext {
//   params: {
//     id: string;
//   };
// }

export async function POST(request: NextRequest){
  return
}
// // Handle uploading an image for a flashcard (both front and back)
// export async function POST(
//   request: NextRequest,
//   // { params }: { params: { id: string } }
//   context: RouteContext
// ) {
//   const { params } = context;
//   const resolvedParams = await params;
//   const requestId = await Logger.info(LogContext.FLASHCARD, "Flashcard image upload request");
  
//   try {
//     // Validate session
//     const session = await getServerSession();
//     if (!session?.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }
    
//     // Get the flashcard ID from the URL parameter
//     const flashcardId = resolvedParams.id;
    
//     // Get form data with the image and side info
//     const formData = await request.formData();
//     const file = formData.get('file') as File | null;
//     const side = formData.get('side') as string | null;
    
//     // Validate inputs
//     if (!file) {
//       await Logger.warning(LogContext.FLASHCARD, "No file provided for upload", { requestId });
//       return NextResponse.json({ error: "No file provided" }, { status: 400 });
//     }
    
//     if (!side || (side !== 'front' && side !== 'back')) {
//       await Logger.warning(LogContext.FLASHCARD, "Invalid side specified for image", { requestId });
//       return NextResponse.json({ error: "Side must be 'front' or 'back'" }, { status: 400 });
//     }
    
//     // Check if flashcard exists and belongs to user
//     const client = await clientPromise;
//     const db = client.db();
    
//     const flashcard = await db.collection('flashcards').findOne({
//       _id: new ObjectId(flashcardId),
//       userId: session.user.id
//     });
    
//     if (!flashcard) {
//       await Logger.warning(LogContext.FLASHCARD, "Flashcard not found or access denied", { requestId });
//       return NextResponse.json({ error: "Flashcard not found" }, { status: 404 });
//     }
    
//     // Read the file data
//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);
    
//     // Create GridFS bucket
//     const bucket = new mongodb.GridFSBucket(db, {
//       bucketName: 'flashcardImages'
//     });
    
//     // Create a file upload stream
//     const uploadStream = bucket.openUploadStream(file.name, {
//       contentType: file.type,
//       metadata: {
//         flashcardId,
//         side,
//         userId: session.user.id,
//         originalName: file.name
//       }
//     });
    
//     // Convert buffer to stream and pipe to upload stream
//     const readableStream = new Readable();
//     readableStream.push(buffer);
//     readableStream.push(null);
    
//     // Wait for the upload to complete
//     await new Promise<void>((resolve, reject) => {
//       readableStream.pipe(uploadStream)
//         .on('finish', () => resolve())
//         .on('error', (error: any) => reject(error));
//     });
    
//     // Get the file ID
//     const fileId = uploadStream.id.toString();
    
//     // Update the flashcard with the image reference
//     await db.collection('flashcards').updateOne(
//       { _id: new ObjectId(flashcardId) },
//       { 
//         $set: { 
//           [`${side}Image`]: fileId,
//           updatedAt: new Date()
//         } 
//       }
//     );
    
//     await Logger.info(LogContext.FLASHCARD, "Image uploaded successfully", {
//       requestId,
//       metadata: { fileId, flashcardId, side }
//     });
    
//     // Return success response
//     return NextResponse.json({
//       fileId,
//       url: `/api/images/${fileId}`,
//       fileName: file.name,
//       mimeType: file.type,
//       size: file.size
//     });
    
//   } catch (error) {
//     const errorMessage = error instanceof Error ? error.message : String(error);
    
//     await Logger.error(LogContext.FLASHCARD, `Error uploading image: ${errorMessage}`, {
//       requestId,
//       metadata: { error }
//     });
    
//     return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
//   }
// }

// // Delete an image from a flashcard
// // Delete an image from a flashcard
// export async function DELETE(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   const resolvedParams = await params;
//   const requestId = await Logger.info(LogContext.FLASHCARD, "Flashcard image delete request");
  
//   try {
//     // Validate session
//     const session = await getServerSession();
//     if (!session?.user) {
//       await Logger.warning(LogContext.FLASHCARD, "Unauthorized image deletion attempt", { requestId });
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }
    
//     const flashcardId = resolvedParams.id;
//     const searchParams = new URL(request.url).searchParams;
//     const side = searchParams.get('side');
    
//     if (!side || (side !== 'front' && side !== 'back')) {
//       await Logger.warning(LogContext.FLASHCARD, "Invalid side specified for image deletion", { requestId });
//       return NextResponse.json({ error: "Side must be 'front' or 'back'" }, { status: 400 });
//     }
    
//     // 1. Find the flashcard
//     const client = await clientPromise;
//     const db = client.db();
    
//     const flashcard = await db.collection('flashcards').findOne({
//       _id: new ObjectId(flashcardId),
//       userId: session.user.id
//     });
    
//     if (!flashcard) {
//       await Logger.warning(LogContext.FLASHCARD, "Flashcard not found or access denied during image deletion", { requestId });
//       return NextResponse.json({ error: "Flashcard not found" }, { status: 404 });
//     }
    
//     // 2. Get the image fileId
//     const imageField = `${side}Image`;
//     const fileId = flashcard[imageField];
    
//     if (!fileId) {
//       await Logger.warning(LogContext.FLASHCARD, "No image exists for deletion", { 
//         requestId, 
//         metadata: { flashcardId, side } 
//       });
//       return NextResponse.json({ error: `No ${side} image exists on this flashcard` }, { status: 404 });
//     }
    
//     // 3. Delete from GridFS
//     const bucket = new mongodb.GridFSBucket(db, {
//       bucketName: 'flashcardImages'
//     });
    
//     await bucket.delete(new ObjectId(fileId));
    
//     // 4. Update the flashcard document
//     await db.collection('flashcards').updateOne(
//       { _id: new ObjectId(flashcardId) },
//       { 
//         $unset: { [imageField]: "" },
//         $set: { updatedAt: new Date() }
//       }
//     );
    
//     await Logger.info(LogContext.FLASHCARD, "Image deleted successfully", {
//       requestId,
//       metadata: { flashcardId, side, fileId }
//     });
    
//     return NextResponse.json({ 
//       message: "Image deleted successfully",
//       flashcardId,
//       side
//     });
    
//   } catch (error) {
//     const errorMessage = error instanceof Error ? error.message : String(error);
    
//     await Logger.error(LogContext.FLASHCARD, `Error deleting image: ${errorMessage}`, {
//       requestId,
//       metadata: { 
//         error,
//         flashcardId: resolvedParams.id,
//         stack: error instanceof Error ? error.stack : undefined
//       }
//     });
    
//     return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
//   }
// }
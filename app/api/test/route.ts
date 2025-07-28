/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/db/mongodb';

export async function GET() {
  try {
    console.log('Testing MongoDB connection...');
    const client = await clientPromise;
    const db = client.db();
    
    // Perform a simple query to verify connection
    await db.command({ ping: 1 });
    
    console.log('MongoDB connection successful!');
    return NextResponse.json({ 
      status: 'success', 
      message: 'Connected to MongoDB successfully!'
    });
  } catch (error: any) {
    console.error('MongoDB connection error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to connect to MongoDB',
      error: error.message
    }, { status: 500 });
  }
}
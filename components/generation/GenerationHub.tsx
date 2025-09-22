'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DocumentTextIcon, 
  PhotoIcon, 
  SpeakerWaveIcon, 
  VideoCameraIcon,
  PencilIcon,
  LinkIcon 
} from '@heroicons/react/24/outline';
import PDFUploader from './PDFUploader';
import ImageUploader from './ImageUploader';
import AudioUploader from './AudioUploader';
import VideoUploader from './VideoUploader';
import TextGenerator from './TextGenerator';
import YouTubeGenerator from './YouTubeGenerator';

type GenerationType = 'text' | 'pdf' | 'images' | 'audio' | 'video' | 'youtube';

interface GenerationOption {
  id: GenerationType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

const generationOptions: GenerationOption[] = [
  {
    id: 'text',
    title: 'Text Prompt',
    description: 'Generate flashcards from a text description or topic',
    icon: PencilIcon,
    color: 'text-blue-600',
    bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
    borderColor: 'border-blue-200 hover:border-blue-300',
  },
  {
    id: 'pdf',
    title: 'PDF Document',
    description: 'Extract content from PDF files and create flashcards',
    icon: DocumentTextIcon,
    color: 'text-red-600',
    bgColor: 'bg-gradient-to-br from-red-50 to-red-100',
    borderColor: 'border-red-200 hover:border-red-300',
  },
  {
    id: 'youtube',
    title: 'YouTube Video',
    description: 'Extract content from YouTube videos and transcripts',
    icon: LinkIcon,
    color: 'text-purple-600',
    bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100',
    borderColor: 'border-purple-200 hover:border-purple-300',
  },
  {
    id: 'images',
    title: 'Images',
    description: 'Analyze images, slides, or diagrams to create flashcards',
    icon: PhotoIcon,
    color: 'text-green-600',
    bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
    borderColor: 'border-green-200 hover:border-green-300',
  },
  {
    id: 'audio',
    title: 'Audio Recording',
    description: 'Transcribe and generate flashcards from audio files',
    icon: SpeakerWaveIcon,
    color: 'text-indigo-600',
    bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
    borderColor: 'border-indigo-200 hover:border-indigo-300',
  },
  {
    id: 'video',
    title: 'Video File',
    description: 'Analyze video content to create comprehensive flashcards',
    icon: VideoCameraIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
    borderColor: 'border-yellow-200 hover:border-yellow-300',
  },
];

export function GenerationHub() {
  const [selectedType, setSelectedType] = useState<GenerationType | null>(null);

  const renderGenerator = () => {
    switch (selectedType) {
      case 'text':
        return <TextGenerator onBack={() => setSelectedType(null)} />;
      case 'pdf':
        return <PDFUploader onBack={() => setSelectedType(null)} />;
      case 'images':
        return <ImageUploader onBack={() => setSelectedType(null)} />;
      case 'audio':
        return <AudioUploader onBack={() => setSelectedType(null)} />;
      case 'video':
        return <VideoUploader onBack={() => setSelectedType(null)} />;
      case 'youtube':
        return <YouTubeGenerator onBack={() => setSelectedType(null)} />;
      default:
        return null;
    }
  };

  if (selectedType) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderGenerator()}
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Content Source
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select how you&apos;d like to generate your flashcards
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {generationOptions.map((option) => {
          const IconComponent = option.icon;
          return (
            <motion.button
              key={option.id}
              onClick={() => setSelectedType(option.id)}
              className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left group ${option.borderColor} ${option.bgColor} hover:shadow-lg`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow`}>
                  <IconComponent className={`w-6 h-6 ${option.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-semibold ${option.color} mb-2`}>
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-700 leading-relaxed">
                    {option.description}
                  </p>
                </div>
              </div>
              
              {/* Hover indicator */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className={`w-2 h-2 rounded-full ${option.color.replace('text-', 'bg-')}`} />
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">✨</span>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 text-lg">
              AI-Powered Processing
            </h4>
            <p className="text-gray-700 text-sm leading-relaxed mb-3">
              All content types are processed using advanced AI to create high-quality flashcards. 
              Large files are processed in the background - you&apos;ll receive an email when they&apos;re ready!
            </p>
            <div className="flex items-center space-x-2 text-xs text-blue-600 font-medium">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Rate limit: 1 AI generation per hour</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
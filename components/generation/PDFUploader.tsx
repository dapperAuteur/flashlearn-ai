'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { 
  DocumentTextIcon, 
  CloudArrowUpIcon, 
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon 
} from '@heroicons/react/24/outline';
import { PDF_MAX_SIZE_MB, PDF_MAX_SIZE_BYTES } from '@/lib/constants';

interface PDFUploaderProps {
  onBack: () => void;
}

interface UploadedJob {
  jobId: string;
  fileName: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  message?: string;
  cardCount?: number;
}

export default function PDFUploader({ onBack }: PDFUploaderProps) {
  const [uploadedJobs, setUploadedJobs] = useState<UploadedJob[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);

  // Check rate limit on component mount
  useEffect(() => {
    checkRateLimit();
  }, []);

  const checkRateLimit = async () => {
    try {
      const response = await fetch('/api/rate-limit/check');
      const data = await response.json();
      setRateLimitExceeded(!data.allowed);
    } catch (error) {
      console.error('Rate limit check failed:', error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > PDF_MAX_SIZE_BYTES) {
      alert(`File is too large. Maximum size is ${PDF_MAX_SIZE_MB}MB.`);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/generate/pdf/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }

      const result = await response.json();
      
      const newJob: UploadedJob = {
        jobId: result.jobId,
        fileName: file.name,
        status: 'processing',
        message: 'Processing your PDF...'
      };

      setUploadedJobs(prev => [newJob, ...prev]);
      
      // Start polling for status
      pollJobStatus(result.jobId);

    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const pollJobStatus = async (jobId: string) => {
    const maxPolls = 60; // 5 minutes max
    let pollCount = 0;

    const poll = async () => {
      if (pollCount >= maxPolls) {
        updateJobStatus(jobId, 'failed', 'Processing timeout');
        return;
      }

      try {
        const response = await fetch(`/api/generate/pdf/status/${jobId}`);
        if (response.ok) {
          const status = await response.json();
          
          if (status.status === 'completed') {
            updateJobStatus(jobId, 'completed', `Generated ${status.result?.flashcards?.length || 0} flashcards`);
            return;
          } else if (status.status === 'failed') {
            updateJobStatus(jobId, 'failed', status.error || 'Processing failed');
            return;
          }
          
          // Update progress message
          updateJobStatus(jobId, 'processing', status.message);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }

      pollCount++;
      setTimeout(poll, 5000); // Poll every 5 seconds
    };

    poll();
  };

  const updateJobStatus = (jobId: string, status: UploadedJob['status'], message?: string) => {
    setUploadedJobs(prev => 
      prev.map(job => 
        job.jobId === jobId 
          ? { ...job, status, message }
          : job
      )
    );
  };

  const removeJob = (jobId: string) => {
    setUploadedJobs(prev => prev.filter(job => job.jobId !== jobId));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to options</span>
        </button>
        <div className="text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
            PDF Upload
          </h2>
          <p className="text-gray-600 mt-1">Extract content and generate flashcards</p>
        </div>
        <div className="w-24"></div> {/* Spacer for centering */}
      </div>

      {/* Rate Limit Warning */}
      {rateLimitExceeded && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 mb-6"
        >
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-orange-900 mb-1">Rate Limit Reached</h4>
              <p className="text-orange-800 text-sm">
                You&apos;ve reached the AI generation limit (1 per hour). Please wait before uploading another file.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragActive 
            ? 'border-red-400 bg-gradient-to-br from-red-50 to-red-100 shadow-lg scale-[1.02]' 
            : rateLimitExceeded
            ? 'border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed'
            : 'border-gray-300 hover:border-red-400 hover:bg-gradient-to-br hover:from-red-50 hover:to-red-100 hover:shadow-xl'
        } ${isUploading ? 'pointer-events-none opacity-75' : ''}`}
      >
        <input {...getInputProps()} disabled={rateLimitExceeded} />
        
        <div className="space-y-6">
          <div className="flex justify-center">
            {isUploading ? (
              <div className="relative">
                <ClockIcon className="w-20 h-20 text-red-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-red-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            ) : rateLimitExceeded ? (
              <ExclamationTriangleIcon className="w-20 h-20 text-gray-400" />
            ) : (
              <div className="relative">
                <CloudArrowUpIcon className="w-20 h-20 text-gray-400" />
                <DocumentTextIcon className="w-8 h-8 text-red-500 absolute -bottom-1 -right-1" />
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-gray-900">
              {isUploading 
                ? 'Uploading PDF...' 
                : rateLimitExceeded
                ? 'Rate Limit Reached'
                : 'Drop your PDF here'
              }
            </h3>
            <p className="text-gray-600 text-lg">
              {isUploading 
                ? 'Please wait while we process your file...'
                : rateLimitExceeded
                ? 'Wait 1 hour before next upload'
                : 'or click to browse files'
              }
            </p>
            <div className="bg-white rounded-lg shadow-sm border p-3 inline-block">
              <p className="text-sm text-gray-500">
                <span className="font-medium">Max size:</span> {PDF_MAX_SIZE_MB}MB • 
                <span className="font-medium"> Format:</span> PDF only
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Queue */}
      {uploadedJobs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Processing Queue
          </h3>
          
          <div className="space-y-3">
            {uploadedJobs.map((job) => (
              <motion.div
                key={job.jobId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${
                  job.status === 'completed' 
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                    : job.status === 'failed'
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {job.status === 'completed' ? (
                        <CheckCircleIcon className="w-6 h-6 text-green-600" />
                      ) : job.status === 'failed' ? (
                        <XMarkIcon className="w-6 h-6 text-red-600" />
                      ) : (
                        <DocumentTextIcon className="w-6 h-6 text-blue-600 animate-pulse" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {job.fileName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {job.message || `Status: ${job.status}`}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeJob(job.jobId)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {job.status === 'completed' && (
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                    <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors">
                      View Flashcards
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
          How PDF processing works:
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Upload your PDF and get an instant job ID</li>
          <li>• Processing happens in the background (30 seconds to 2 minutes)</li>
          <li>• You&apos;ll receive an email notification when complete</li>
          <li>• Continue using the app while we process your files</li>
        </ul>
      </div>
    </div>
  );
}
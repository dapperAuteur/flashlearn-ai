'use client';

import { useRouter } from 'next/navigation';
import { Dialog } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignUpModal({ isOpen, onClose }: SignUpModalProps) {
  const router = useRouter();

  const handleSignUp = () => {
    onClose();
    router.push('/signup'); // Or your registration page
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <ExclamationTriangleIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            <div className="ml-4 text-left">
              <Dialog.Title className="text-lg font-semibold leading-6 text-gray-900">
                Unlock This Feature
              </Dialog.Title>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Studying in reverse (Back → Front) is an exclusive feature for registered users. Create a free account to unlock this and other powerful study tools!
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
              onClick={handleSignUp}
            >
              Sign Up for Free
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              onClick={onClose}
            >
              Maybe Later
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
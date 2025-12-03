'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';
import {
  uploadImage,
  createVideoBatch,
  createVideoItem,
  updateVideoItemOperationId,
} from '@/lib/api/upload';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const MAX_IMAGES = 12;
const MIN_IMAGES = 1;

interface UploadedImage {
  file: File;
  preview: string;
  id: string;
}

export function ImageUploadForm({ user }: { user: User }) {
  const router = useRouter();
  const [selectedImages, setSelectedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const newImages: UploadedImage[] = [];

      files.forEach((file) => {
        if (selectedImages.length + newImages.length >= MAX_IMAGES) {
          return;
        }

        if (!['image/jpeg', 'image/png'].includes(file.type)) {
          setError('JPG와 PNG 형식만 지원합니다');
          return;
        }

        const preview = URL.createObjectURL(file);
        newImages.push({
          file,
          preview,
          id: `${Date.now()}-${Math.random()}`,
        });
      });

      setSelectedImages([...selectedImages, ...newImages]);
      setError(null);
    },
    [selectedImages]
  );

  const removeImage = (id: string) => {
    const image = selectedImages.find((img) => img.id === id);
    if (image) {
      URL.revokeObjectURL(image.preview);
    }
    setSelectedImages(selectedImages.filter((img) => img.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedImages.length < MIN_IMAGES || selectedImages.length > MAX_IMAGES) {
      setError(`${MIN_IMAGES}장 이상 ${MAX_IMAGES}장 이하의 이미지를 선택해주세요`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Step 1: Create batch
      const batch = await createVideoBatch(user);

      // Step 2: Upload images and create video items
      let completed = 0;

      for (const image of selectedImages) {
        try {
          // Step 2-1: Upload to Supabase Storage and get public URL
          const { publicUrl } = await uploadImage(image.file, user);

          // Step 3: Pre-save to database
          const videoItem = await createVideoItem(batch.id, user.id, publicUrl);

          // Step 4: Request video generation via API endpoint
          let operationId: string | undefined;
          try {
            const generateResponse = await fetch('/api/videos/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: publicUrl }),
            });

            if (!generateResponse.ok) {
              throw new Error('Failed to request video generation');
            }

            const veoResponse = await generateResponse.json();
            operationId = veoResponse.id;

            // Step 5: Update operation ID
            if (operationId) {
              await updateVideoItemOperationId(videoItem.id, operationId);
            } else {
              throw new Error('Operation ID not received from API');
            }
          } catch (runwayError) {
            console.error('Failed to request video generation:', runwayError);
            const errorMessage = runwayError instanceof Error ? runwayError.message : String(runwayError);
            console.error('[ImageUploadForm] Detailed error:', {
              error: runwayError,
              message: errorMessage,
              stack: runwayError instanceof Error ? runwayError.stack : undefined,
              videoItemId: videoItem.id,
              operationId: operationId,
            });
            setError('영상 생성 요청에 실패했습니다. 다시 시도해주세요.');
          }

          completed++;
          setUploadProgress(Math.round((completed / selectedImages.length) * 100));
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '이미지 업로드 실패';
          setError(errorMessage);
          return;
        }
      }

      // Show completion modal (next implementation)
      router.push(`/results/${user.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-lg bg-white shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">사진을 업로드하세요</h2>
        <p className="text-gray-600 mb-8">
          {MIN_IMAGES}장 이상 {MAX_IMAGES}장 이하의 JPG 또는 PNG 이미지를 선택해주세요. 각 사진은{' '}
          {4}초의 영상으로 변환됩니다.
        </p>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Input Area */}
          <div className="relative">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="sr-only"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 text-center hover:border-purple-400"
            >
              <div>
                <p className="text-lg font-medium text-gray-900">사진을 선택해주세요</p>
                <p className="text-sm text-gray-500">또는 여기를 클릭하여 파일을 선택하세요</p>
              </div>
            </label>
          </div>

          {/* Image Preview Grid */}
          {selectedImages.length > 0 && (
            <div>
              <p className="mb-4 text-sm font-medium text-gray-700">
                선택된 이미지 ({selectedImages.length}/{MAX_IMAGES})
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {selectedImages.map((image) => (
                  <div
                    key={image.id}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100"
                  >
                    <Image src={image.preview} alt="Preview" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      disabled={isUploading}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100"
                    >
                      <X className="h-6 w-6 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">업로드 중...</p>
                <span className="text-sm text-gray-600">{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={
              isUploading ||
              selectedImages.length < MIN_IMAGES ||
              selectedImages.length > MAX_IMAGES
            }
            className="w-full"
          >
            {isUploading ? `업로드 중... (${uploadProgress}%)` : `영상 생성 시작`}
          </Button>
        </form>

        <p className="mt-4 text-xs text-gray-500">
          영상 생성은 몇 분 정도 소요될 수 있습니다. 완료되면 이메일로 알려드립니다.
        </p>
      </div>
    </div>
  );
}

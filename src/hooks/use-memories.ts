import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMemories, getMemory, createMemory, updateMemory, deleteMemory, getAlbumsByMemory, createAlbum, updateAlbum, deleteAlbum } from '@/lib/firestore';
import { Memory, Album } from '@/types';

export function useMemories(ownerUid: string) {
  return useQuery({
    queryKey: ['memories', ownerUid],
    queryFn: () => getMemories(ownerUid),
    enabled: !!ownerUid,
  });
}

export function useMemory(id: string) {
  return useQuery({
    queryKey: ['memory', id],
    queryFn: () => getMemory(id),
    enabled: !!id && id !== 'new',
  });
}

export function useCreateMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMemory,
    onSuccess: (newMemory) => {
      queryClient.invalidateQueries({ queryKey: ['memories', newMemory.ownerUid] });
    },
  });
}

export function useUpdateMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMemory,
    onSuccess: (updatedMemory) => {
      queryClient.invalidateQueries({ queryKey: ['memory', updatedMemory.id] });
      queryClient.invalidateQueries({ queryKey: ['memories', updatedMemory.ownerUid] });
    },
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMemory,
    onSuccess: (deletedMemory) => {
      queryClient.invalidateQueries({ queryKey: ['memory', deletedMemory.id] });
      queryClient.invalidateQueries({ queryKey: ['memories', deletedMemory.ownerUid] });
    },
  });
}

// アルバム関連のフック
export function useAlbumsByMemory(memoryId: string) {
  return useQuery({
    queryKey: ['albums', memoryId],
    queryFn: () => getAlbumsByMemory(memoryId),
    enabled: !!memoryId,
  });
}

export function useCreateAlbum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAlbum,
    onSuccess: (newAlbum) => {
      queryClient.invalidateQueries({ queryKey: ['albums', newAlbum.memoryId] });
    },
  });
}

export function useUpdateAlbum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAlbum,
    onSuccess: (updatedAlbum) => {
      queryClient.invalidateQueries({ queryKey: ['albums', updatedAlbum.memoryId] });
    },
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAlbum,
    onSuccess: (deletedAlbum) => {
      queryClient.invalidateQueries({ queryKey: ['albums', deletedAlbum.memoryId] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getMemoriesByUser, 
  getMemoryById, 
  createMemory, 
  updateMemory, 
  deleteMemory 
} from '@/lib/firestore';
import { Memory } from '@/types';

// 想い出一覧を取得
export function useMemories(ownerUid: string) {
  return useQuery({
    queryKey: ['memories', ownerUid],
    queryFn: () => getMemoriesByUser(ownerUid),
    enabled: !!ownerUid,
  });
}

// 個別の想い出を取得
export function useMemory(memoryId: string) {
  return useQuery({
    queryKey: ['memory', memoryId],
    queryFn: () => getMemoryById(memoryId),
    enabled: !!memoryId,
  });
}

// 想い出を作成
export function useCreateMemory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createMemory,
    onSuccess: (memoryId, variables) => {
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ['memories', variables.ownerUid] });
      
      // 新しく作成されたmemoryをキャッシュに追加
      queryClient.setQueryData(['memory', memoryId], {
        id: memoryId,
        ...variables,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    },
  });
}

// 想い出を更新
export function useUpdateMemory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ memoryId, updates }: { memoryId: string; updates: Partial<Memory> }) =>
      updateMemory(memoryId, updates),
    onSuccess: (_, { memoryId, updates }) => {
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ['memory', memoryId] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      
      // 楽観的更新
      queryClient.setQueryData(['memory', memoryId], (old: Memory | undefined) => {
        if (!old) return old;
        return {
          ...old,
          ...updates,
          updatedAt: new Date(),
        };
      });
    },
  });
}

// 想い出を削除
export function useDeleteMemory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteMemory,
    onSuccess: (_, memoryId) => {
      // キャッシュから削除
      queryClient.removeQueries({ queryKey: ['memory', memoryId] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
  });
}

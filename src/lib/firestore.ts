import { Memory, Asset, PublicPage, ClaimRequest, Order, Album } from '@/types';

// モックデータ
const mockMemories: Memory[] = [
  {
    id: 'mock-1',
    ownerUid: 'mock-user-id',
    title: '初めての想い出',
    type: 'personal',
    status: 'draft',
    design: {
      theme: 'default',
      layout: 'standard',
      colors: {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        background: '#FFFFFF',
      },
    },
    blocks: [
      {
        id: 'block-1',
        type: 'text',
        order: 0,
        visibility: 'public',
        content: 'これは開発用のサンプル想い出です。',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'mock-2',
    ownerUid: 'mock-user-id',
    title: '大切な瞬間',
    type: 'family',
    status: 'published',
    design: {
      theme: 'warm',
      layout: 'standard',
      colors: {
        primary: '#EF4444',
        secondary: '#DC2626',
        background: '#FEF2F2',
      },
    },
    blocks: [
      {
        id: 'block-2',
        type: 'text',
        order: 0,
        visibility: 'public',
        content: '家族との大切な時間を記録しました。',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

// モックアルバムデータ
const mockAlbums: Album[] = [
  {
    id: 'album-1',
    memoryId: 'mock-1',
    ownerUid: 'mock-user-id',
    title: '思い出の写真集',
    description: '大切な瞬間を集めたアルバム',
    layout: 'grid',
    assets: ['asset-1', 'asset-2', 'asset-3'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// モック関数
export async function getMemories(ownerUid: string): Promise<Memory[]> {
  console.log('Mock: Getting memories for user:', ownerUid);
  return mockMemories.filter(memory => memory.ownerUid === ownerUid);
}

export async function getMemory(id: string): Promise<Memory | null> {
  console.log('Mock: Getting memory:', id);
  return mockMemories.find(memory => memory.id === id) || null;
}

export async function createMemory(memoryData: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Memory> {
  console.log('Mock: Creating memory:', memoryData.title);
  const newMemory: Memory = {
    ...memoryData,
    id: `mock-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockMemories.push(newMemory);
  return newMemory;
}

export async function updateMemory(memory: Memory): Promise<Memory> {
  console.log('Mock: Updating memory:', memory.id);
  const index = mockMemories.findIndex(m => m.id === memory.id);
  if (index !== -1) {
    mockMemories[index] = { ...memory, updatedAt: new Date() };
  }
  return mockMemories[index];
}

export async function deleteMemory(memoryId: string): Promise<Memory> {
  console.log('Mock: Deleting memory:', memoryId);
  const index = mockMemories.findIndex(m => m.id === memoryId);
  if (index !== -1) {
    const deletedMemory = mockMemories[index];
    mockMemories.splice(index, 1);
    return deletedMemory;
  }
  throw new Error('Memory not found');
}

export async function getAssetsByMemory(memoryId: string): Promise<Asset[]> {
  console.log('Mock: Getting assets for memory:', memoryId);
  return [];
}

export async function createAsset(assetData: Omit<Asset, 'id' | 'createdAt'>): Promise<Asset> {
  console.log('Mock: Creating asset:', assetData.name);
  return {
    ...assetData,
    id: `asset-${Date.now()}`,
    createdAt: new Date(),
  };
}

export async function deleteAsset(assetId: string): Promise<void> {
  console.log('Mock: Deleting asset:', assetId);
}

// アルバム関連の関数
export async function getAlbumsByMemory(memoryId: string): Promise<Album[]> {
  console.log('Mock: Getting albums for memory:', memoryId);
  return mockAlbums.filter(album => album.memoryId === memoryId);
}

export async function createAlbum(albumData: Omit<Album, 'id' | 'createdAt' | 'updatedAt'>): Promise<Album> {
  console.log('Mock: Creating album:', albumData.title);
  const newAlbum: Album = {
    ...albumData,
    id: `album-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockAlbums.push(newAlbum);
  return newAlbum;
}

export async function updateAlbum(album: Album): Promise<Album> {
  console.log('Mock: Updating album:', album.id);
  const index = mockAlbums.findIndex(a => a.id === album.id);
  if (index !== -1) {
    mockAlbums[index] = { ...album, updatedAt: new Date() };
  }
  return mockAlbums[index];
}

export async function deleteAlbum(albumId: string): Promise<Album> {
  console.log('Mock: Deleting album:', albumId);
  const index = mockAlbums.findIndex(a => a.id === albumId);
  if (index !== -1) {
    const deletedAlbum = mockAlbums[index];
    mockAlbums.splice(index, 1);
    return deletedAlbum;
  }
  throw new Error('Album not found');
}

export async function getPublicPages(): Promise<PublicPage[]> {
  console.log('Mock: Getting public pages');
  return [];
}

export async function getClaimRequests(): Promise<ClaimRequest[]> {
  console.log('Mock: Getting claim requests');
  return [];
}

export async function getOrders(): Promise<Order[]> {
  console.log('Mock: Getting orders');
  return [];
}

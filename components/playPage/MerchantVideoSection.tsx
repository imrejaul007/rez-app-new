import React from 'react';
import { View, StyleSheet } from 'react-native';
import TypedFlashList from '@/components/ui/TypedFlashList';
import { UGCVideoItem, PLAY_PAGE_COLORS } from '@/types/playPage.types';
import SectionHeader from './SectionHeader';
import ThumbnailVideoCard from './ThumbnailVideoCard';

interface MerchantVideoSectionProps {
  videos: UGCVideoItem[];
  onVideoPress: (video: UGCVideoItem) => void;
  onViewAllPress?: () => void;
  loading?: boolean;
}

function MerchantVideoSection({
  videos,
  onVideoPress,
  onViewAllPress,
  loading = false
}: MerchantVideoSectionProps) {
  const renderItem = ({ item }: { item: UGCVideoItem }) => (
    <ThumbnailVideoCard
      item={item}
      onPress={onVideoPress}
      showHashtags={true}
    />
  );

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Products"
        showViewAll={videos.length > 4}
        onViewAllPress={onViewAllPress}
      />

      <TypedFlashList
        data={videos.slice(0, 4)}
        renderItem={renderItem}
        keyExtractor={(item: any, index: number) => item.id || `merchant-video-${index}`}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={250}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: PLAY_PAGE_COLORS.background,
    paddingBottom: 24,
    marginBottom: 8,
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  row: {
    justifyContent: 'space-between',
    gap: 12,
  },
});

export default React.memo(MerchantVideoSection);

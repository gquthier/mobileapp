import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles/theme';
import { TopBar } from '../components/TopBar';
import { Icon } from '../components/Icon';

const ChatScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TopBar
          title="AI Chat"
          right={<Icon name="sparkles" size={20} color={colors.black} />}
        />
        <View style={styles.centerContent}>
          <Icon name="messageSquare" size={48} color={colors.gray400} />
          <Text style={styles.title}>AI Chat</Text>
          <Text style={styles.subtitle}>Coming soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.black,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray600,
  },
});

export default ChatScreen;
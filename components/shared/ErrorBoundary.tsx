import React, { ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, DevSettings } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    this.setState({ errorInfo });
  }

  private handleRestart = () => {
    // Restarts the JS bundle
    DevSettings.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Something went wrong 😕</Text>
            <Text style={styles.subtitle}>Please restart the app to continue.</Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.devScroll}>
                <Text style={styles.devErrorTitle}>{this.state.error.toString()}</Text>
                <Text style={styles.devStack}>{this.state.errorInfo?.componentStack}</Text>
              </ScrollView>
            )}

            <TouchableOpacity style={styles.restartButton} onPress={this.handleRestart} activeOpacity={0.8}>
              <Text style={styles.restartButtonText}>Restart</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F3',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#17172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontFamily: 'DMSans-Medium',
    fontSize: 20,
    fontWeight: '600',
    color: '#17172A',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#9B9BAF',
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
  },
  devScroll: {
    backgroundColor: '#17172A',
    borderRadius: 12,
    padding: 12,
    maxHeight: 200,
    width: '100%',
    marginBottom: 20,
  },
  devErrorTitle: {
    fontFamily: 'DMMono',
    fontSize: 12,
    color: '#E85858',
    fontWeight: 'bold',
  },
  devStack: {
    fontFamily: 'DMMono',
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  restartButton: {
    backgroundColor: '#5B4FE8',
    borderRadius: 12,
    height: 48,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  restartButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    fontWeight: '600',
  },
});

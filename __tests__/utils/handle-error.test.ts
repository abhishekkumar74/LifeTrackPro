import { handleSupabaseError } from '../../lib/utils/handle-error';
import { useUiStore } from '../../lib/store/ui.store';
import { captureError } from '../../lib/sentry';
import NetInfo from '@react-native-community/netinfo';

jest.mock('../../lib/store/ui.store', () => ({
  useUiStore: {
    getState: jest.fn().mockReturnValue({
      showToast: jest.fn(),
    }),
  },
}));

jest.mock('../../lib/sentry', () => ({
  captureError: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}));

describe('handleSupabaseError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does nothing if error is null/undefined', async () => {
    handleSupabaseError(null, 'test-context');
    expect(NetInfo.fetch).not.toHaveBeenCalled();
    expect(captureError).not.toHaveBeenCalled();
  });

  test('shows normal error message when online', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
    const mockError = { status: 401, message: 'Unauthorized' };

    handleSupabaseError(mockError, 'test-context');

    // Wait for promise resolution in the utility
    await new Promise(process.nextTick);

    expect(useUiStore.getState().showToast).toHaveBeenCalledWith('Please log in again', 'error');
    expect(captureError).toHaveBeenCalledWith(mockError, { context: 'test-context' });
  });

  test('shows offline custom message when offline', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
    const mockError = { status: 500, message: 'Server error' };

    handleSupabaseError(mockError, 'test-context');

    // Wait for promise resolution in the utility
    await new Promise(process.nextTick);

    expect(useUiStore.getState().showToast).toHaveBeenCalledWith(
      'No internet connection. Changes will sync when online.',
      'info'
    );
    expect(captureError).toHaveBeenCalledWith(mockError, { context: 'test-context' });
  });

  test('falls back to normal error message when NetInfo fetch rejects', async () => {
    (NetInfo.fetch as jest.Mock).mockRejectedValue(new Error('NetInfo Error'));
    const mockError = { status: 429, message: 'Rate limited' };

    handleSupabaseError(mockError, 'test-context');

    // Wait for promise resolution in the utility
    await new Promise(process.nextTick);

    expect(useUiStore.getState().showToast).toHaveBeenCalledWith('Too many requests. Wait a moment.', 'error');
    expect(captureError).toHaveBeenCalledWith(mockError, { context: 'test-context' });
  });
});

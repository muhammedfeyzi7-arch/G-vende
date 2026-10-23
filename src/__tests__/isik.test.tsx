import { fireEvent, render, screen, act } from '@testing-library/react-native';

let mockGranted = false;
const mockRequest = jest.fn(async () => ({ granted: mockGranted }));
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: mockGranted }, mockRequest],
}));
jest.mock('expo-brightness', () => ({ getBrightnessAsync: jest.fn(async () => 0.5), setBrightnessAsync: jest.fn(async () => {}) }));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, Stack: { Screen: () => null }, useLocalSearchParams: () => ({}) }));

const Screen = require('@/app/isik').default;
const flush = () => act(async () => new Promise((r) => setTimeout(r, 10)));

describe('Fener', () => {
  it('kamera izni verilmezse LED açılmaz ve açıkça söylenir', async () => {
    mockGranted = false;
    await act(async () => {
      render(<Screen />);
    });
    await fireEvent.press(screen.getByLabelText('LED fener'));
    await flush();
    expect(mockRequest).toHaveBeenCalled();
    expect(screen.getByText(/kamera izni gerekiyor/)).toBeTruthy();
    expect(screen.getByLabelText('LED fener').props.accessibilityState).toMatchObject({ checked: false });
  });
  it('izin varsa LED açılır', async () => {
    mockGranted = true;
    await act(async () => {
      render(<Screen />);
    });
    await fireEvent.press(screen.getByLabelText('LED fener'));
    await flush();
    expect(screen.getByText('LED fener açık')).toBeTruthy();
  });
});

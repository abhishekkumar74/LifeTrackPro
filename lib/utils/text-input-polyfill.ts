import { TextInput } from 'react-native';

/**
 * Polyfill for React Native and React Native Web TextInput.State.
 *
 * @gorhom/bottom-sheet BottomSheetTextInput relies on RNTextInput.State.currentlyFocusedInput()
 * which is absent in react-native-web and some modern React Native runtimes.
 * This prevents: "Uncaught Error: RNTextInput.default.State.currentlyFocusedInput is not a function"
 */
const target = TextInput as any;

if (target) {
  if (!target.State) {
    target.State = {};
  }

  if (typeof target.State.currentlyFocusedInput !== 'function') {
    target.State.currentlyFocusedInput = function () {
      if (typeof target.State.currentlyFocusedField === 'function') {
        return target.State.currentlyFocusedField();
      }
      if (typeof document !== 'undefined' && document.activeElement) {
        return document.activeElement;
      }
      return null;
    };
  }

  if (typeof target.State.currentlyFocusedField !== 'function') {
    target.State.currentlyFocusedField = function () {
      if (typeof target.State.currentlyFocusedInput === 'function') {
        return target.State.currentlyFocusedInput();
      }
      if (typeof document !== 'undefined' && document.activeElement) {
        return document.activeElement;
      }
      return null;
    };
  }

  if (target.default) {
    if (!target.default.State) {
      target.default.State = target.State;
    } else {
      if (typeof target.default.State.currentlyFocusedInput !== 'function') {
        target.default.State.currentlyFocusedInput = target.State.currentlyFocusedInput;
      }
      if (typeof target.default.State.currentlyFocusedField !== 'function') {
        target.default.State.currentlyFocusedField = target.State.currentlyFocusedField;
      }
    }
  }
}

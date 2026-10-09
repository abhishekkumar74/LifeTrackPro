import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { SubjectPicker } from '@/components/shared/SubjectPicker';

interface QuickCaptureSheetProps {
  subjects: string[];
  lastUsedSubject: string | null;
  onSave: (content: string, subject: string) => void;
  isSaving: boolean;
}

export interface QuickCaptureSheetRef {
  expand: () => void;
  close: () => void;
}

export const QuickCaptureSheet = forwardRef<QuickCaptureSheetRef, QuickCaptureSheetProps>(
  ({ subjects, lastUsedSubject, onSave, isSaving }, ref) => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [content, setContent] = useState('');
    const [selectedSubject, setSelectedSubject] = useState<string>('Other');

    // Sync selected subject with lastUsedSubject when loaded
    useEffect(() => {
      if (lastUsedSubject) {
        setSelectedSubject(lastUsedSubject);
      } else if (subjects.length > 0) {
        setSelectedSubject(subjects[0]);
      } else {
        setSelectedSubject('Other');
      }
    }, [lastUsedSubject, subjects]);

    useImperativeHandle(ref, () => ({
      expand: () => {
        setContent('');
        bottomSheetRef.current?.expand();
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
    }));

    const handleSave = () => {
      const trimmed = content.trim();
      if (!trimmed) return;
      onSave(trimmed, selectedSubject);
    };

    // Double enter auto-save check
    const handleTextChange = (text: string) => {
      setContent(text);
      if (text.endsWith('\n\n')) {
        const trimmed = text.trim();
        if (trimmed) {
          onSave(trimmed, selectedSubject);
        }
      }
    };

    const renderBackdrop = (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    );

    const mergedSubjects = Array.from(new Set([...subjects, 'Other']));

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['42%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Quick Note</Text>

          {/* Large multiline text input */}
          <BottomSheetTextInput
            style={styles.textInput}
            value={content}
            onChangeText={handleTextChange}
            placeholder="Capture your thought... (Press Enter 2x to save)"
            placeholderTextColor="#9B9BAF"
            multiline
            textAlignVertical="top"
          />

          {/* Bottom Controls Row */}
          <View style={styles.controlsRow}>
            {/* Subject Selector */}
            <View style={styles.subjectCol}>
              <Text style={styles.label}>LINK TO SUBJECT</Text>
              <SubjectPicker
                selectedSubject={selectedSubject === 'Other' ? null : selectedSubject}
                onSelect={(s) => setSelectedSubject(s || 'Other')}
                placeholder="Select subject..."
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!content.trim() || isSaving) && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={!content.trim() || isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

QuickCaptureSheet.displayName = 'QuickCaptureSheet';

const styles = StyleSheet.create({
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    flex: 1,
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 22,
    color: '#17172A',
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: 'DMSans',
    fontSize: 15,
    color: '#17172A',
    lineHeight: 22,
    padding: 0,
    marginTop: 4,
    marginBottom: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F2F1EE',
    paddingTop: 14,
    gap: 12,
  },
  subjectCol: {
    flex: 1,
    overflow: 'hidden',
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    color: '#9B9BAF',
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: 6,
  },
  subjectsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  subjectChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#F7F6F3',
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  subjectChipActive: {
    backgroundColor: '#EAE8FD',
    borderColor: '#5B4FE8',
  },
  subjectChipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#5C5C70',
    fontWeight: '500',
  },
  subjectChipTextActive: {
    color: '#5B4FE8',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#5B4FE8',
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B4FE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 70,
  },
  saveBtnDisabled: {
    backgroundColor: '#C5C5D3',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
  },
});

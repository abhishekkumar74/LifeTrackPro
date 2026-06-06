import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  ActivityIndicator,
  Platform,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSubjects, useAddSubject } from '@/lib/hooks/use-subjects';
import { getSubjectColor } from '@/lib/utils/subject-colors';
import { Check, Plus, Search } from 'lucide-react-native';

interface SubjectPickerProps {
  selectedSubject: string | null;
  onSelect: (subject: string | null) => void;
  placeholder?: string;
  isDark?: boolean; // styled for dark theme (Focus mode)
  style?: any;
  textStyle?: any;
}

export const SubjectPicker: React.FC<SubjectPickerProps> = ({
  selectedSubject,
  onSelect,
  placeholder = 'Select subject',
  isDark = false,
  style,
  textStyle,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const { data: subjects = [], isLoading } = useSubjects();
  const addSubjectMutation = useAddSubject();

  const handleOpen = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    setIsAddingNew(false);
    setNewSubjectName('');
    sheetRef.current?.expand();
  };

  const handleSelect = (subject: string | null) => {
    onSelect(subject === 'None' || subject === 'Other' ? null : subject);
    sheetRef.current?.close();
  };

  const handleAddNewSubject = () => {
    const subjectName = searchQuery.trim() || newSubjectName.trim();
    if (!subjectName) return;

    addSubjectMutation.mutate(subjectName, {
      onSuccess: (formattedName) => {
        onSelect(formattedName);
        sheetRef.current?.close();
      },
    });
  };

  // Filter list based on search
  const filteredSubjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return subjects;
    return subjects.filter((s) => s.toLowerCase().includes(query));
  }, [searchQuery, subjects]);

  // Check if search query exactly matches an existing subject
  const hasExactMatch = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return subjects.some((s) => s.toLowerCase() === query);
  }, [searchQuery, subjects]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const selectedColor = selectedSubject ? getSubjectColor(selectedSubject) : '#9B9BAF';

  return (
    <View style={styles.wrapper}>
      {/* Trigger button */}
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.7}
        style={[
          styles.trigger,
          isDark ? styles.triggerDark : styles.triggerLight,
          style,
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.triggerContent}>
          <View style={[styles.colorDot, { backgroundColor: selectedColor }]} />
          <Text
            numberOfLines={1}
            style={[
              styles.triggerText,
              isDark ? styles.triggerTextDark : styles.triggerTextLight,
              !selectedSubject && styles.placeholderText,
              textStyle,
            ]}
          >
            {selectedSubject || placeholder}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Picker Bottom Sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['55%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Select Subject</Text>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={16} color="#9B9BAF" style={styles.searchIcon} />
            <BottomSheetTextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={(txt) => {
                setSearchQuery(txt);
                setIsAddingNew(false);
              }}
              placeholder="Search subjects..."
              placeholderTextColor="#9B9BAF"
            />
          </View>

          {/* Options List */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.optionsScroll}
          >
            {isLoading ? (
              <ActivityIndicator color="#5B4FE8" style={styles.loader} />
            ) : (
              <>
                {/* None Option */}
                <TouchableOpacity
                  style={[styles.optionItem, !selectedSubject && styles.optionItemActive]}
                  onPress={() => handleSelect(null)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.colorDot, { backgroundColor: '#9B9BAF' }]} />
                    <Text style={[styles.optionText, !selectedSubject && styles.optionTextActive]}>
                      None (General)
                    </Text>
                  </View>
                  {!selectedSubject && <Check size={16} color="#5B4FE8" />}
                </TouchableOpacity>

                {/* Filtered Subjects */}
                {filteredSubjects.map((sub) => {
                  const isSelected = selectedSubject === sub;
                  const color = getSubjectColor(sub);
                  return (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.optionItem, isSelected && styles.optionItemActive]}
                      onPress={() => handleSelect(sub)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <View style={styles.optionLeft}>
                        <View style={[styles.colorDot, { backgroundColor: color }]} />
                        <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                          {sub}
                        </Text>
                      </View>
                      {isSelected && <Check size={16} color="#5B4FE8" />}
                    </TouchableOpacity>
                  );
                })}

                {/* Inline new subject creation when searching */}
                {searchQuery.trim().length > 0 && !hasExactMatch && (
                  <TouchableOpacity
                    style={styles.customAddRow}
                    onPress={handleAddNewSubject}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Plus size={16} color="#5B4FE8" />
                    <Text style={styles.customAddText}>
                      Add custom: "{searchQuery.trim()}"
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Add Custom Button when not searching */}
                {searchQuery.trim().length === 0 && !isAddingNew && (
                  <TouchableOpacity
                    style={styles.addCustomTrigger}
                    onPress={() => setIsAddingNew(true)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Plus size={16} color="#5B4FE8" />
                    <Text style={styles.addCustomTriggerText}>Add Custom Subject</Text>
                  </TouchableOpacity>
                )}

                {/* Add Custom Inline Form */}
                {isAddingNew && (
                  <View style={styles.addForm}>
                    <BottomSheetTextInput
                      style={styles.formInput}
                      value={newSubjectName}
                      onChangeText={setNewSubjectName}
                      placeholder="Enter subject name..."
                      placeholderTextColor="#9B9BAF"
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[
                        styles.formBtn,
                        (!newSubjectName.trim() || addSubjectMutation.isPending) && styles.formBtnDisabled,
                      ]}
                      onPress={handleAddNewSubject}
                      disabled={!newSubjectName.trim() || addSubjectMutation.isPending}
                      activeOpacity={0.8}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {addSubjectMutation.isPending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.formBtnText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
  },
  trigger: {
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  triggerLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
  },
  triggerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  triggerText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  triggerTextLight: {
    color: '#17172A',
  },
  triggerTextDark: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  placeholderText: {
    color: '#9B9BAF',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    flex: 1,
  },
  sheetTitle: {
    fontFamily: 'InstrumentSerif',
    fontSize: 22,
    color: '#17172A',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#17172A',
    padding: 0,
  },
  optionsScroll: {
    paddingBottom: 20,
  },
  loader: {
    marginVertical: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  optionItemActive: {
    backgroundColor: '#F7F6F3',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: '#5C5C70',
  },
  optionTextActive: {
    fontFamily: 'DMSans-Medium',
    color: '#17172A',
    fontWeight: '600',
  },
  customAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 8,
    marginTop: 8,
  },
  customAddText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#5B4FE8',
    fontWeight: '500',
  },
  addCustomTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F1EE',
  },
  addCustomTriggerText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#5B4FE8',
    fontWeight: '500',
  },
  addForm: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F2F1EE',
    paddingTop: 12,
  },
  formInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    fontFamily: 'DMSans',
    fontSize: 14,
  },
  formBtn: {
    backgroundColor: '#5B4FE8',
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formBtnDisabled: {
    backgroundColor: '#C5C5D3',
  },
  formBtnText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
  },
});

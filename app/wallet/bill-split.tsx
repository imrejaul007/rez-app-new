/**
 * Bill Split Screen
 * Split bills and send payment requests
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import uuid from 'react-native-uuid';
import apiClient from '@/services/apiClient';

type Step = 1 | 2 | 3 | 4;

interface Participant {
  id: string;
  phone: string;
}

export default function BillSplitScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [totalAmount, setTotalAmount] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sentRequests, setSentRequests] = useState<{ phone: string; deepLink: string }[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const amount = parseFloat(totalAmount) || 0;
  const splitAmount = amount / (participants.length + 1); // including self

  const handleAddParticipant = () => {
    if (!phoneInput.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    // Basic phone validation
    const phoneRegex = /^[0-9\-\+\s]{10,}$/;
    if (!phoneRegex.test(phoneInput)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    const newParticipant: Participant = {
      id: uuid.v4() as string,
      phone: phoneInput.trim(),
    };

    setParticipants([...participants, newParticipant]);
    setPhoneInput('');
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!totalAmount || parseFloat(totalAmount) <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (participants.length === 0) {
        Alert.alert('Error', 'Please add at least one participant');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleSendRequests = async () => {
    try {
      // Extract phone numbers from participants
      const participantPhones = participants.map(p => p.phone);

      // Call backend API to create the split
      const response = await apiClient.post('/wallet/split', {
        totalAmount: amount,
        participants: participantPhones,
      });

      // Generate requests with the split ID from backend
      const requests: { phone: string; deepLink: string }[] = [];
      const splitId = response.data.data?.splitId || uuid.v4();

      for (const participant of participants) {
        const deepLink = `https://pay.rez.app/split/${splitId}?amount=${splitAmount.toFixed(2)}&to=${participant.phone}`;
        requests.push({ phone: participant.phone, deepLink });
      }

      setSentRequests(requests);
      showToastMessage(`Payment requests sent to ${requests.length} participants!`);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to send payment requests');
    }
  };

  const handleCopyLink = async (deepLink: string) => {
    await Clipboard.setStringAsync(deepLink);
    showToastMessage('Link copied to clipboard!');
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Split Bill</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((step) => (
          <React.Fragment key={step}>
            <View
              style={[
                styles.progressStep,
                step <= currentStep && styles.progressStepActive,
              ]}
            >
              <Text
                style={[
                  styles.progressStepText,
                  step <= currentStep && styles.progressStepTextActive,
                ]}
              >
                {step}
              </Text>
            </View>
            {step < 4 && (
              <View
                style={[
                  styles.progressLine,
                  step < currentStep && styles.progressLineActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Progress Labels */}
      <View style={styles.progressLabels}>
        <Text style={styles.progressLabel}>Amount</Text>
        <Text style={styles.progressLabel}>Add People</Text>
        <Text style={styles.progressLabel}>Review</Text>
        <Text style={styles.progressLabel}>Send</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Enter Amount */}
        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>How much to split?</Text>
            <Text style={styles.stepSubtitle}>Enter the total bill amount</Text>

            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                value={totalAmount}
                onChangeText={setTotalAmount}
                keyboardType="decimal-pad"
                selectionColor={Colors.primary}
              />
            </View>

            {amount > 0 && (
              <View style={styles.splitPreview}>
                <Text style={styles.splitPreviewText}>
                  Per person: ₹{splitAmount.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step 2: Add Participants */}
        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Add participants</Text>
            <Text style={styles.stepSubtitle}>Who else is paying?</Text>

            {/* Phone Input */}
            <View style={styles.addParticipantContainer}>
              <View style={styles.phoneInputWrapper}>
                <Ionicons name="call" size={20} color={Colors.primary} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Phone number"
                  placeholderTextColor={Colors.textSecondary}
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  keyboardType="phone-pad"
                  selectionColor={Colors.primary}
                />
              </View>
              <Pressable
                onPress={handleAddParticipant}
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="add" size={24} color={Colors.white} />
              </Pressable>
            </View>

            {/* Participants List */}
            {participants.length > 0 && (
              <View style={styles.participantsList}>
                <Text style={styles.participantsListTitle}>
                  {participants.length} participant{participants.length !== 1 ? 's' : ''}
                </Text>
                {participants.map((participant) => (
                  <View key={participant.id} style={styles.participantItem}>
                    <Ionicons name="person-circle" size={32} color={Colors.primary} />
                    <Text style={styles.participantPhone}>{participant.phone}</Text>
                    <Pressable
                      onPress={() => handleRemoveParticipant(participant.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={24} color={Colors.error} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.info}>
              <Ionicons name="information-circle" size={16} color={Colors.info} />
              <Text style={styles.infoText}>
                You and {participants.length} other{participants.length !== 1 ? 's' : ''} will split the bill
              </Text>
            </View>
          </View>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review split</Text>
            <Text style={styles.stepSubtitle}>Check the amount each person pays</Text>

            <View style={styles.summaryCard}>
              <LinearGradient
                colors={['rgba(108, 99, 255, 0.1)', 'rgba(108, 99, 255, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summaryCardContent}
              >
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Bill</Text>
                  <Text style={styles.summaryValue}>₹{amount.toFixed(2)}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Split Among</Text>
                  <Text style={styles.summaryValue}>{participants.length + 1} people</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryHighlight}>Per Person</Text>
                  <Text style={styles.summaryHighlightValue}>₹{splitAmount.toFixed(2)}</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.participantsReview}>
              <Text style={styles.participantsReviewTitle}>Participants</Text>
              <View style={styles.reviewList}>
                {/* You */}
                <View style={styles.reviewItem}>
                  <View style={styles.reviewItemLabel}>
                    <Ionicons name="person" size={16} color={Colors.primary} />
                    <Text style={styles.reviewItemName}>You</Text>
                  </View>
                  <Text style={styles.reviewItemAmount}>₹{splitAmount.toFixed(2)}</Text>
                </View>

                {/* Others */}
                {participants.map((participant) => (
                  <View key={participant.id} style={styles.reviewItem}>
                    <View style={styles.reviewItemLabel}>
                      <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
                      <Text style={styles.reviewItemName}>{participant.phone}</Text>
                    </View>
                    <Text style={styles.reviewItemAmount}>₹{splitAmount.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Step 4: Send Requests */}
        {currentStep === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Send payment requests</Text>
            <Text style={styles.stepSubtitle}>Share payment links with participants</Text>

            {sentRequests.length === 0 ? (
              <>
                <View style={styles.readyCard}>
                  <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
                  <Text style={styles.readyTitle}>Ready to send!</Text>
                  <Text style={styles.readySubtitle}>
                    Each person will receive a payment link for ₹{splitAmount.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.requestsList}>
                  {participants.map((participant) => (
                    <View key={participant.id} style={styles.requestItem}>
                      <Ionicons name="person" size={20} color={Colors.primary} />
                      <Text style={styles.requestItemPhone}>{participant.phone}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={styles.successCard}>
                  <Ionicons name="checkmark-done-all" size={48} color={Colors.success} />
                  <Text style={styles.successTitle}>Requests sent!</Text>
                  <Text style={styles.successSubtitle}>
                    {sentRequests.length} payment request{sentRequests.length !== 1 ? 's' : ''} created
                  </Text>
                </View>

                <View style={styles.sentRequestsList}>
                  {sentRequests.map((request, idx) => (
                    <View key={idx} style={styles.sentRequestItem}>
                      <View style={styles.sentRequestInfo}>
                        <Ionicons name="person" size={20} color={Colors.primary} />
                        <View style={styles.sentRequestDetails}>
                          <Text style={styles.sentRequestPhone}>{request.phone}</Text>
                          <Text style={styles.sentRequestAmount}>
                            ₹{splitAmount.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => handleCopyLink(request.deepLink)}
                        style={styles.copyButton}
                      >
                        <Ionicons name="copy" size={20} color={Colors.primary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <Pressable
            onPress={() => setCurrentStep((currentStep - 1) as Step)}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        )}

        {currentStep < 4 ? (
          <Pressable
            onPress={handleNextStep}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>
                {currentStep === 3 ? 'Continue' : 'Next'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            onPress={sentRequests.length === 0 ? handleSendRequests : () => router.back()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>
                {sentRequests.length === 0 ? 'Send Requests' : 'Done'}
              </Text>
              <Ionicons
                name={sentRequests.length === 0 ? 'send' : 'arrow-forward'}
                size={16}
                color={Colors.white}
              />
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* Toast */}
      {showToast && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.heading3,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: Spacing.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: Colors.primary,
  },
  progressStepText: {
    ...Typography.body2,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  progressStepTextActive: {
    color: Colors.white,
  },
  progressLine: {
    height: 2,
    flex: 1,
    backgroundColor: Colors.border,
  },
  progressLineActive: {
    backgroundColor: Colors.primary,
  },
  progressLabels: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  progressLabel: {
    flex: 1,
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  stepContainer: {
    gap: Spacing.md,
  },
  stepTitle: {
    ...Typography.heading2,
    color: Colors.text,
  },
  stepSubtitle: {
    ...Typography.body2,
    color: Colors.textSecondary,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
    gap: Spacing.md,
  },
  currencySymbol: {
    ...Typography.heading1,
    color: Colors.primary,
  },
  amountInput: {
    flex: 1,
    ...Typography.heading1,
    color: Colors.text,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingVertical: Spacing.sm,
  },
  splitPreview: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    alignItems: 'center',
  },
  splitPreviewText: {
    ...Typography.body2,
    color: Colors.primary,
    fontWeight: '600',
  },
  addParticipantContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  phoneInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    ...Typography.body2,
    color: Colors.text,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantsList: {
    gap: Spacing.md,
    marginVertical: Spacing.lg,
  },
  participantsListTitle: {
    ...Typography.body1,
    color: Colors.text,
    fontWeight: '600',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    gap: Spacing.md,
  },
  participantPhone: {
    ...Typography.body2,
    color: Colors.text,
    flex: 1,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  infoText: {
    ...Typography.body2,
    color: Colors.text,
    flex: 1,
  },
  summaryCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginVertical: Spacing.lg,
    ...Shadows.md,
  },
  summaryCardContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...Typography.body2,
    color: Colors.textSecondary,
  },
  summaryValue: {
    ...Typography.body2,
    color: Colors.text,
    fontWeight: '600',
  },
  summaryHighlight: {
    ...Typography.body1,
    color: Colors.text,
    fontWeight: '600',
  },
  summaryHighlightValue: {
    ...Typography.heading2,
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  participantsReview: {
    gap: Spacing.md,
    marginVertical: Spacing.lg,
  },
  participantsReviewTitle: {
    ...Typography.body1,
    color: Colors.text,
    fontWeight: '600',
  },
  reviewList: {
    gap: Spacing.sm,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
  },
  reviewItemLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  reviewItemName: {
    ...Typography.body2,
    color: Colors.text,
  },
  reviewItemAmount: {
    ...Typography.body2,
    color: Colors.primary,
    fontWeight: '600',
  },
  readyCard: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  readyTitle: {
    ...Typography.heading2,
    color: Colors.text,
  },
  readySubtitle: {
    ...Typography.body2,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  requestsList: {
    gap: Spacing.sm,
    marginVertical: Spacing.lg,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
  },
  requestItemPhone: {
    ...Typography.body2,
    color: Colors.text,
  },
  successCard: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  successTitle: {
    ...Typography.heading2,
    color: Colors.text,
  },
  successSubtitle: {
    ...Typography.body2,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sentRequestsList: {
    gap: Spacing.sm,
    marginVertical: Spacing.lg,
  },
  sentRequestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
  },
  sentRequestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  sentRequestDetails: {
    flex: 1,
  },
  sentRequestPhone: {
    ...Typography.body2,
    color: Colors.text,
    fontWeight: '600',
  },
  sentRequestAmount: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  copyButton: {
    padding: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  secondaryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    ...Typography.body2,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    ...Typography.body2,
    color: Colors.white,
    fontWeight: '600',
  },
  toast: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.success,
    gap: Spacing.md,
    ...Shadows.lg,
  },
  toastText: {
    ...Typography.body2,
    color: Colors.white,
    flex: 1,
  },
});

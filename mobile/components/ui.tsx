import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { theme } from '@/src/theme';

export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
  edges = ['top'],
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor={theme.colors.green}
                colors={[theme.colors.green]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function AppHeader({
  title,
  eyebrow,
  subtitle,
  right,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  tone,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'default' | 'green' | 'gold' | 'danger';
}) {
  const toneStyle =
    tone === 'green'
      ? { backgroundColor: theme.colors.greenSoft, borderColor: '#C9DCD1' }
      : tone === 'gold'
        ? { backgroundColor: theme.colors.goldSoft, borderColor: '#E4D2B2' }
        : tone === 'danger'
          ? { backgroundColor: theme.colors.dangerSoft, borderColor: '#EAC9C4' }
          : null;
  const content = <View style={[styles.card, toneStyle, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

export function SectionTitle({
  title,
  action,
  description,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.flex}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { backgroundColor: theme.colors.green, borderColor: theme.colors.green, text: '#fff' },
    secondary: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.lineStrong,
      text: theme.colors.ink,
    },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent', text: theme.colors.green },
    danger: {
      backgroundColor: theme.colors.dangerSoft,
      borderColor: '#E3BDB7',
      text: theme.colors.danger,
    },
    gold: { backgroundColor: theme.colors.gold, borderColor: theme.colors.gold, text: '#fff' },
  }[variant];
  const padding =
    size === 'sm' ? styles.btnSm : size === 'lg' ? styles.btnLg : styles.btnMd;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        padding,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <Text style={[styles.buttonText, { color: palette.text, fontSize: size === 'sm' ? 12 : 14 }]}>
          {icon ? `${icon}  ` : ''}
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  style,
  ...inputProps
}: TextInputProps & { label: string; hint?: string; error?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.muted}
        {...inputProps}
        style={[styles.input, inputProps.multiline && styles.inputMultiline]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  disabled,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({
  label,
  tone = 'muted',
}: {
  label: string;
  tone?: 'muted' | 'green' | 'gold' | 'danger' | 'info' | 'warning';
}) {
  const palette = {
    muted: { bg: theme.colors.surfaceMuted, fg: theme.colors.muted },
    green: { bg: theme.colors.greenSoft, fg: theme.colors.green },
    gold: { bg: theme.colors.goldSoft, fg: theme.colors.gold },
    danger: { bg: theme.colors.dangerSoft, fg: theme.colors.danger },
    info: { bg: theme.colors.infoSoft, fg: theme.colors.info },
    warning: { bg: theme.colors.warningSoft, fg: theme.colors.warning },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

export function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <View style={styles.progressWrap}>
      {label ? (
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressValue}>%{clamped}</Text>
        </View>
      ) : null}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${clamped}%` }]} />
      </View>
    </View>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyMark}>izleer</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function Loading({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.colors.green} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.keyValue}>
      <Text style={styles.keyValueLabel}>{label}</Text>
      <Text style={styles.keyValueValue}>{value}</Text>
    </View>
  );
}

export function PhotoThumb({
  uri,
  size = 76,
  onPress,
}: {
  uri: string;
  size?: number;
  onPress?: () => void;
}) {
  const body = (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted }}
      contentFit="cover"
      transition={120}
    />
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
      {body}
    </Pressable>
  );
}

export function Notice({
  title,
  children,
  tone = 'info',
}: {
  title: string;
  children: ReactNode;
  tone?: 'info' | 'warning' | 'danger' | 'green';
}) {
  const palette = {
    info: { bg: theme.colors.infoSoft, border: '#C8DAE6', fg: theme.colors.info },
    warning: { bg: theme.colors.warningSoft, border: '#E6D7AC', fg: theme.colors.warning },
    danger: { bg: theme.colors.dangerSoft, border: '#EAC9C4', fg: theme.colors.danger },
    green: { bg: theme.colors.greenSoft, border: '#C9DCD1', fg: theme.colors.green },
  }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.noticeTitle, { color: palette.fg }]}>{title}</Text>
      <Text style={styles.noticeBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.paper },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.xxl,
    gap: theme.space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.xs,
  },
  headerText: { flex: 1, gap: 2 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.gold,
    fontWeight: '700',
  },
  title: {
    fontFamily: serif,
    fontSize: 30,
    lineHeight: 34,
    color: theme.colors.ink,
    fontWeight: '600',
  },
  subtitle: { fontSize: 13, color: theme.colors.muted, lineHeight: 19 },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    gap: theme.space.sm,
    ...theme.shadow.card,
  },
  pressed: { opacity: 0.88 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.space.md,
    marginTop: theme.space.sm,
  },
  sectionTitle: {
    fontFamily: serif,
    fontSize: 20,
    color: theme.colors.ink,
    fontWeight: '600',
  },
  sectionDescription: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  button: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnSm: { paddingHorizontal: 10, paddingVertical: 6 },
  btnMd: { paddingHorizontal: 14, paddingVertical: 11 },
  btnLg: { paddingHorizontal: 18, paddingVertical: 14 },
  buttonText: { fontWeight: '600' },
  field: { gap: 5 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.lineStrong,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 15,
    color: theme.colors.ink,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  hint: { fontSize: 11, color: theme.colors.muted },
  errorText: { fontSize: 11, color: theme.colors.danger },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: theme.colors.green, borderColor: theme.colors.green },
  chipText: { fontSize: 12.5, color: theme.colors.inkSoft },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  badge: { borderRadius: theme.radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },
  statTile: {
    flex: 1,
    minWidth: 84,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    gap: 2,
  },
  statValue: { fontFamily: serif, fontSize: 22, color: theme.colors.green, fontWeight: '700' },
  statUnit: { fontSize: 11, color: theme.colors.muted, fontWeight: '400' },
  statLabel: { fontSize: 10.5, color: theme.colors.muted },
  progressWrap: { gap: 6 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 11.5, color: theme.colors.inkSoft },
  progressValue: { fontSize: 11.5, color: theme.colors.green, fontWeight: '700' },
  progressTrack: {
    height: 8,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  progressFill: { height: 8, backgroundColor: theme.colors.green, borderRadius: theme.radius.pill },
  empty: { alignItems: 'center', paddingVertical: theme.space.xxl, paddingHorizontal: theme.space.lg, gap: 6 },
  emptyMark: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: theme.colors.gold,
    fontWeight: '700',
  },
  emptyTitle: { fontFamily: serif, fontSize: 20, color: theme.colors.ink, textAlign: 'center' },
  emptyDescription: { fontSize: 13, color: theme.colors.muted, textAlign: 'center', lineHeight: 19 },
  emptyAction: { marginTop: theme.space.sm },
  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  loadingText: { fontSize: 12, color: theme.colors.muted },
  divider: { height: 1, backgroundColor: theme.colors.line, marginVertical: theme.space.xs },
  keyValue: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.space.md, paddingVertical: 3 },
  keyValueLabel: { fontSize: 12, color: theme.colors.muted, flexShrink: 0 },
  keyValueValue: { fontSize: 12.5, color: theme.colors.ink, fontWeight: '600', textAlign: 'right', flex: 1 },
  notice: { borderWidth: 1, borderRadius: theme.radius.md, padding: theme.space.md, gap: 3 },
  noticeTitle: { fontSize: 12, fontWeight: '700' },
  noticeBody: { fontSize: 11.5, color: theme.colors.inkSoft, lineHeight: 17 },
});

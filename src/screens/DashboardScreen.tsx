import React, {useEffect, useState} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Alert,
  Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import {supabase} from '../lib/supabase';
import {Todo, Priority} from '../lib/types';

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(str: string, n: number) {
  const d = new Date(str + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}
function getMondayOf(str: string) {
  const d = new Date(str + 'T00:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDateStr(d);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PRIO_ORDER: Record<Priority, number> = {high: 0, medium: 1, low: 2};
const PRIO_COLOR: Record<Priority, string> = {high: '#ff4757', medium: '#ffa502', low: '#2ed573'};
const CATEGORIES = ['Work', 'Personal', 'Shopping', 'Health', 'Learning', 'Other'];

export default function DashboardScreen({navigation}: any) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const [weekMonday, setWeekMonday] = useState(() => getMondayOf(toDateStr(new Date())));
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const todayStr = toDateStr(new Date());

  useEffect(() => { init(); }, []);

  async function init() {
    const {data: {session}} = await supabase.auth.getSession();
    if (!session) { navigation.replace('Login'); return; }
    setUserEmail(session.user.email ?? '');
    await loadTodos(session.user.id);
  }

  async function loadTodos(uid?: string) {
    if (!uid) {
      const {data: {session}} = await supabase.auth.getSession();
      uid = session?.user.id;
    }
    if (!uid) { return; }
    const {data} = await supabase
      .from('todos').select('*').eq('user_id', uid)
      .order('created_at', {ascending: false});
    setTodos(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  async function addTodo(t: {title: string; description?: string; priority: Priority; category?: string}) {
    const {data: {session}} = await supabase.auth.getSession();
    if (!session) { return; }
    const {data} = await supabase.from('todos').insert({
      ...t, due_date: selectedDate, user_id: session.user.id, completed: false,
    }).select().single();
    if (data) { setTodos(p => [data, ...p]); }
  }

  async function toggle(id: string, completed: boolean) {
    await supabase.from('todos').update({completed: !completed}).eq('id', id);
    setTodos(p => p.map(t => t.id === id ? {...t, completed: !completed} : t));
  }

  async function remove(id: string) {
    Alert.alert('Delete', 'Delete this task?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('todos').delete().eq('id', id);
        setTodos(p => p.filter(t => t.id !== id));
      }},
    ]);
  }

  async function logout() {
    Alert.alert('Sign Out', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Sign Out', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
        navigation.replace('Login');
      }},
    ]);
  }

  const weekDays = Array.from({length: 7}, (_, i) => addDays(weekMonday, i));
  const counts: Record<string, {total: number; done: number}> = {};
  todos.forEach(t => {
    if (!t.due_date) { return; }
    counts[t.due_date] = counts[t.due_date] || {total: 0, done: 0};
    counts[t.due_date].total++;
    if (t.completed) { counts[t.due_date].done++; }
  });

  const filtered = todos
    .filter(t => {
      if (t.due_date !== selectedDate) { return false; }
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) { return false; }
      if (filter === 'active') { return !t.completed; }
      if (filter === 'done') { return t.completed; }
      return true;
    })
    .sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]);

  const todayTasks = todos.filter(t => t.due_date === todayStr);
  const todayDone = todayTasks.filter(t => t.completed).length;
  const totalDone = todos.filter(t => t.completed).length;
  const overdue = todos.filter(t => !t.completed && t.due_date && t.due_date < todayStr).length;
  const isToday = selectedDate === todayStr;
  const pct = isToday
    ? (todayTasks.length > 0 ? Math.round(todayDone / todayTasks.length * 100) : 0)
    : (todos.length > 0 ? Math.round(totalDone / todos.length * 100) : 0);

  const selLabel = selectedDate === todayStr ? 'Today'
    : selectedDate === addDays(todayStr, 1) ? 'Tomorrow'
    : selectedDate === addDays(todayStr, -1) ? 'Yesterday'
    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});

  const headerMonth = (() => {
    const d = new Date(weekDays[0] + 'T00:00:00');
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  })();

  return (
    <View style={s.container}>
      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadTodos(); }}
            tintColor="#e8c547"
          />
        }
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={s.header}>
              <View>
                <Text style={s.badge}>✦ WORKSPACE</Text>
                <Text style={s.greeting}>
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}
                </Text>
                <Text style={s.email}>{userEmail}</Text>
              </View>
              <TouchableOpacity onPress={logout} style={s.logoutBtn}>
                <Text style={s.logoutText}>Sign out</Text>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={s.statsRow}>
              {[
                {label: 'Total', value: todos.length, color: '#c8c8e0'},
                {label: 'Done', value: totalDone, color: '#2ed573'},
                {label: 'Pending', value: todos.filter(t => !t.completed).length, color: '#e8c547'},
                {label: 'Overdue', value: overdue, color: '#ff4757'},
              ].map(({label, value, color}) => (
                <View key={label} style={s.stat}>
                  <Text style={[s.statVal, {color}]}>{value}</Text>
                  <Text style={s.statLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Progress */}
            <View style={s.progWrap}>
              <View style={s.progHeader}>
                <Text style={s.progLabel}>
                  {isToday ? `Today · ${todayDone}/${todayTasks.length} tasks` : 'Overall progress'}
                </Text>
                <Text style={s.progPct}>{pct}%</Text>
              </View>
              <View style={s.progBar}>
                <View style={[s.progFill, {width: `${pct}%`}]} />
              </View>
            </View>

            {/* Date Browser */}
            <View style={s.dateSection}>
              <View style={s.dateHeader}>
                <Text style={s.dateMonth}>{headerMonth}</Text>
                <View style={s.dateNav}>
                  {selectedDate !== todayStr && (
                    <TouchableOpacity
                      onPress={() => { setWeekMonday(getMondayOf(todayStr)); setSelectedDate(todayStr); }}
                      style={s.todayBtn}>
                      <Text style={s.todayBtnText}>Today</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setWeekMonday(w => addDays(w, -7))} style={s.navBtn}>
                    <Text style={s.navBtnText}>‹</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setWeekMonday(w => addDays(w, 7))} style={s.navBtn}>
                    <Text style={s.navBtnText}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.weekRow}>
                {weekDays.map((ds, i) => {
                  const dt = new Date(ds + 'T00:00:00');
                  const isSel = ds === selectedDate;
                  const isT = ds === todayStr;
                  const isPast = ds < todayStr;
                  const c = counts[ds];
                  return (
                    <TouchableOpacity
                      key={ds}
                      onPress={() => setSelectedDate(isSel ? todayStr : ds)}
                      style={[s.dayCell, isSel && s.dayCellSel, isT && !isSel && s.dayCellToday, i < 6 && s.dayCellBorder]}
                      activeOpacity={0.7}>
                      <Text style={[s.dayName, isSel && s.dayNameSel, isT && !isSel && s.dayNameToday, isPast && !isSel && !isT && s.dayNamePast]}>
                        {DAYS[dt.getDay()]}
                      </Text>
                      <View style={[s.dateCircle, isSel && s.dateCircleSel, isT && !isSel && s.dateCircleToday]}>
                        <Text style={[s.dateNum, isSel && s.dateNumSel, isT && !isSel && s.dateNumToday, isPast && !isSel && !isT && s.dateNumPast]}>
                          {dt.getDate()}
                        </Text>
                      </View>
                      <Text style={[s.dotArea, isSel && {color: '#e8c547'}]}>
                        {c ? (c.done === c.total ? '✓' : '•'.repeat(Math.min(c.total - c.done, 3))) : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={s.selRow}>
                <View style={s.divider} />
                <Text style={s.selLabel}>{selLabel}</Text>
                <View style={s.divider} />
              </View>
            </View>

            {/* Search */}
            <View style={s.searchRow}>
              <TextInput
                style={s.search}
                value={search}
                onChangeText={setSearch}
                placeholder="Search tasks..."
                placeholderTextColor="#6b6b8a"
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={s.clearX}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Filters */}
            <View style={s.filterRow}>
              {(['all', 'active', 'done'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[s.filterBtn, filter === f && s.filterBtnActive]}>
                  <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                    {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Done'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({item: t}) => (
          <View style={[s.todoCard, {borderLeftColor: PRIO_COLOR[t.priority]}, t.completed && s.todoCardDone]}>
            <TouchableOpacity
              onPress={() => toggle(t.id, t.completed)}
              style={[s.checkbox, t.completed && s.checkboxDone]}>
              {t.completed && <Text style={s.checkMark}>✓</Text>}
            </TouchableOpacity>
            <View style={s.todoContent}>
              <Text style={[s.todoTitle, t.completed && s.todoDone]} numberOfLines={2}>
                {t.title}
              </Text>
              {t.description ? <Text style={s.todoDesc} numberOfLines={1}>{t.description}</Text> : null}
              <View style={s.todoMeta}>
                <Text style={[s.prioBadge, {color: PRIO_COLOR[t.priority]}]}>{t.priority}</Text>
                {t.category ? <Text style={s.tag}>{t.category}</Text> : null}
              </View>
            </View>
            <TouchableOpacity onPress={() => remove(t.id)} style={s.delBtn}>
              <Text style={s.delText}>🗑</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color="#e8c547" style={{marginTop: 40}} />
          ) : (
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>📝</Text>
              <Text style={s.emptyTitle}>No tasks for this day</Text>
              <Text style={s.emptySub}>Tap + to add one</Text>
            </View>
          )
        }
        contentContainerStyle={{padding: 16, paddingBottom: 120}}
      />

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Modal */}
      <AddModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={addTodo}
        selectedDate={selectedDate}
      />
    </View>
  );
}

function AddModal({visible, onClose, onAdd, selectedDate}: {
  visible: boolean; onClose: () => void;
  onAdd: (t: any) => void; selectedDate: string;
}) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState('');

  function submit() {
    if (!title.trim()) { Alert.alert('Error', 'Please enter a title.'); return; }
    onAdd({title: title.trim(), description: desc.trim() || undefined, priority, category: category || undefined});
    setTitle(''); setDesc(''); setPriority('medium'); setCategory('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={m.backdrop}>
        <TouchableOpacity style={m.dismiss} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>New Task</Text>
              <TouchableOpacity onPress={onClose} style={m.closeBtn}>
                <Text style={m.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TextInput
                style={m.input} value={title} onChangeText={setTitle}
                placeholder="Task title" placeholderTextColor="#6b6b8a" autoFocus
              />
              <TextInput
                style={[m.input, {minHeight: 60}]} value={desc} onChangeText={setDesc}
                placeholder="Description (optional)" placeholderTextColor="#6b6b8a" multiline
              />
              <Text style={m.label}>Priority</Text>
              <View style={m.row}>
                {(['high', 'medium', 'low'] as Priority[]).map(p => (
                  <TouchableOpacity
                    key={p} onPress={() => setPriority(p)}
                    style={[m.chip, priority === p && {borderColor: PRIO_COLOR[p], backgroundColor: `${PRIO_COLOR[p]}18`}]}>
                    <Text style={[m.chipText, priority === p && {color: PRIO_COLOR[p]}]}>
                      {p === 'high' ? '🔴 High' : p === 'medium' ? '🟡 Med' : '🟢 Low'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={m.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['None', ...CATEGORIES].map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c === 'None' ? '' : c)}
                    style={[m.catChip, (c === 'None' ? category === '' : category === c) && m.catChipActive]}>
                    <Text style={[m.catText, (c === 'None' ? category === '' : category === c) && m.catTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[m.addBtn, !title.trim() && m.addBtnOff]}
                onPress={submit} disabled={!title.trim()}>
                <Text style={m.addBtnText}>Add Task</Text>
              </TouchableOpacity>
              <View style={{height: 20}} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0a0a0f'},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16},
  badge: {fontSize: 10, color: '#6b6b8a', letterSpacing: 1, marginBottom: 2},
  greeting: {fontSize: 24, fontWeight: '700', color: '#fff'},
  email: {fontSize: 11, color: '#6b6b8a', marginTop: 2},
  logoutBtn: {backgroundColor: '#1a1a24', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a3a', paddingHorizontal: 12, paddingVertical: 8},
  logoutText: {color: '#6b6b8a', fontSize: 13},
  statsRow: {flexDirection: 'row', gap: 8, marginBottom: 16},
  stat: {flex: 1, backgroundColor: '#1a1a24', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a3a', padding: 10, alignItems: 'center'},
  statVal: {fontSize: 20, fontWeight: '700'},
  statLabel: {fontSize: 10, color: '#6b6b8a', marginTop: 2},
  progWrap: {marginBottom: 16},
  progHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6},
  progLabel: {fontSize: 11, color: '#6b6b8a'},
  progPct: {fontSize: 11, color: '#e8c547'},
  progBar: {height: 4, backgroundColor: '#2a2a3a', borderRadius: 999, overflow: 'hidden'},
  progFill: {height: '100%', backgroundColor: '#e8c547', borderRadius: 999},
  dateSection: {marginBottom: 16},
  dateHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  dateMonth: {fontSize: 14, fontWeight: '600', color: '#c8c8e0'},
  dateNav: {flexDirection: 'row', gap: 6, alignItems: 'center'},
  todayBtn: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(232,197,71,0.1)', borderWidth: 1, borderColor: 'rgba(232,197,71,0.25)'},
  todayBtnText: {fontSize: 11, color: '#e8c547', fontWeight: '600'},
  navBtn: {width: 28, height: 28, backgroundColor: '#1a1a24', borderRadius: 6, borderWidth: 1, borderColor: '#2a2a3a', alignItems: 'center', justifyContent: 'center'},
  navBtnText: {color: '#6b6b8a', fontSize: 18, lineHeight: 22},
  weekRow: {flexDirection: 'row', backgroundColor: '#1a1a24', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a3a', overflow: 'hidden'},
  dayCell: {flex: 1, paddingVertical: 8, alignItems: 'center', gap: 3},
  dayCellSel: {backgroundColor: 'rgba(232,197,71,0.12)'},
  dayCellToday: {backgroundColor: 'rgba(232,197,71,0.04)'},
  dayCellBorder: {borderRightWidth: 1, borderRightColor: '#2a2a3a'},
  dayName: {fontSize: 9, color: '#6b6b8a'},
  dayNameSel: {color: '#e8c547'},
  dayNameToday: {color: '#e8c547'},
  dayNamePast: {color: '#2a2a3a'},
  dateCircle: {width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center'},
  dateCircleSel: {backgroundColor: '#e8c547'},
  dateCircleToday: {borderWidth: 1, borderColor: 'rgba(232,197,71,0.4)', backgroundColor: 'rgba(232,197,71,0.1)'},
  dateNum: {fontSize: 13, fontWeight: '600', color: '#c8c8e0'},
  dateNumSel: {color: '#0a0a0f'},
  dateNumToday: {color: '#e8c547'},
  dateNumPast: {color: '#2a2a3a'},
  dotArea: {fontSize: 8, color: '#6b6b8a', height: 10},
  selRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8},
  divider: {flex: 1, height: 1, backgroundColor: '#2a2a3a'},
  selLabel: {fontSize: 11, color: '#6b6b8a'},
  searchRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a24', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a3a', paddingHorizontal: 12, marginBottom: 10},
  search: {flex: 1, color: '#c8c8e0', fontSize: 14, paddingVertical: 12},
  clearX: {color: '#6b6b8a', fontSize: 14},
  filterRow: {flexDirection: 'row', gap: 8, marginBottom: 12},
  filterBtn: {flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a1a24', borderWidth: 1, borderColor: '#2a2a3a', alignItems: 'center'},
  filterBtnActive: {backgroundColor: '#e8c547', borderColor: '#e8c547'},
  filterText: {fontSize: 13, color: '#6b6b8a', fontWeight: '500'},
  filterTextActive: {color: '#0a0a0f', fontWeight: '700'},
  todoCard: {backgroundColor: '#1a1a24', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a3a', borderLeftWidth: 3, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 10},
  todoCardDone: {opacity: 0.5},
  checkbox: {width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#2a2a3a', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0},
  checkboxDone: {backgroundColor: '#e8c547', borderColor: '#e8c547'},
  checkMark: {color: '#0a0a0f', fontSize: 11, fontWeight: '700'},
  todoContent: {flex: 1},
  todoTitle: {fontSize: 14, fontWeight: '500', color: '#c8c8e0', lineHeight: 20},
  todoDone: {textDecorationLine: 'line-through', color: '#6b6b8a'},
  todoDesc: {fontSize: 11, color: '#6b6b8a', marginTop: 2},
  todoMeta: {flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap'},
  prioBadge: {fontSize: 10, fontWeight: '600', textTransform: 'capitalize'},
  tag: {fontSize: 10, color: '#6b6b8a'},
  delBtn: {padding: 4},
  delText: {fontSize: 14},
  emptyWrap: {alignItems: 'center', paddingVertical: 60},
  emptyEmoji: {fontSize: 40, marginBottom: 12},
  emptyTitle: {fontSize: 16, color: '#c8c8e0', fontWeight: '600'},
  emptySub: {fontSize: 13, color: '#6b6b8a', marginTop: 4},
  fab: {position: 'absolute', bottom: 32, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#e8c547', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#e8c547', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 10},
  fabText: {fontSize: 30, color: '#0a0a0f', fontWeight: '300', lineHeight: 34},
});

const m = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.6)'},
  dismiss: {flex: 1},
  sheet: {backgroundColor: '#1a1a24', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#2a2a3a', padding: 20, maxHeight: '90%'},
  handle: {width: 36, height: 4, backgroundColor: '#2a2a3a', borderRadius: 2, alignSelf: 'center', marginBottom: 16},
  sheetHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  sheetTitle: {fontSize: 20, fontWeight: '700', color: '#fff'},
  closeBtn: {width: 32, height: 32, backgroundColor: '#111118', borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  closeBtnText: {color: '#6b6b8a', fontSize: 14},
  input: {backgroundColor: '#111118', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 10, padding: 14, color: '#c8c8e0', fontSize: 15, marginBottom: 12},
  label: {fontSize: 12, color: '#6b6b8a', marginBottom: 8},
  row: {flexDirection: 'row', gap: 8, marginBottom: 16},
  chip: {flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#2a2a3a', backgroundColor: '#111118', alignItems: 'center'},
  chipText: {fontSize: 11, color: '#6b6b8a'},
  catChip: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#2a2a3a', backgroundColor: '#111118', marginRight: 8, marginBottom: 16},
  catChipActive: {borderColor: '#e8c547', backgroundColor: 'rgba(232,197,71,0.1)'},
  catText: {fontSize: 12, color: '#6b6b8a'},
  catTextActive: {color: '#e8c547', fontWeight: '600'},
  addBtn: {backgroundColor: '#e8c547', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8},
  addBtnOff: {backgroundColor: '#6b6b8a'},
  addBtnText: {color: '#0a0a0f', fontWeight: '700', fontSize: 16},
});

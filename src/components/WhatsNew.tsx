import React, { useState, useEffect, useMemo } from 'react';
import { NewsItem } from '../types';
import { INITIAL_NEWS_ITEMS } from '../data/defaultNews';
import { safeLocalStorage } from '../utils/storage';
import { saveNewsItemToFirebase, deleteNewsItemFromFirebase, subscribeNewsList } from '../lib/firebase';
import { NanSeasonsLogo } from './NanSeasonsLogo';
import {
  Sparkles,
  Search,
  PlusCircle,
  Bell,
  CheckCircle,
  Pin,
  Tag,
  Calendar,
  User,
  Trash2,
  X,
  ChevronRight,
  Info,
  AlertTriangle,
  Megaphone,
  BookOpen,
  Filter,
  Eye,
  CheckCheck,
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'nan_seasons_news_list_v1';
const READ_ITEMS_KEY = 'nan_seasons_news_read_ids_v1';

export function getStoredNewsList(): NewsItem[] {
  try {
    const saved = safeLocalStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read news list from localStorage', e);
  }
  return INITIAL_NEWS_ITEMS;
}

export function saveNewsListLocally(list: NewsItem[]) {
  try {
    safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save news list locally', e);
  }
}

export function getReadNewsIds(): string[] {
  try {
    const saved = safeLocalStorage.getItem(READ_ITEMS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to read read news IDs', e);
  }
  return [];
}

export function saveReadNewsIdsLocally(ids: string[]) {
  try {
    safeLocalStorage.setItem(READ_ITEMS_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to save read news IDs', e);
  }
}

interface WhatsNewProps {
  staffList?: string[];
  currentUser?: string;
  onNavigateTab?: (tab: 'dashboard' | 'cashCount' | 'receiptSubstitute' | 'dailyRevenue' | 'frontOfficeChecklist') => void;
}

export const WhatsNew: React.FC<WhatsNewProps> = ({ staffList = [], currentUser = 'Admin', onNavigateTab }) => {
  const [newsList, setNewsList] = useState<NewsItem[]>(getStoredNewsList);
  const [readIds, setReadIds] = useState<string[]>(getReadNewsIds);
  const [activeCategory, setActiveCategory] = useState<'all' | 'system' | 'hotel' | 'sop'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New News Item Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'system' | 'hotel' | 'sop'>('hotel');
  const [newPriority, setNewPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [newVersion, setNewVersion] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newAuthor, setNewAuthor] = useState(currentUser || 'ฝ่ายบริหาร (Management)');
  const [newTags, setNewTags] = useState('');
  const [newPinned, setNewPinned] = useState(false);

  // Sync with Firestore
  useEffect(() => {
    const unsubscribe = subscribeNewsList((remoteNews) => {
      if (remoteNews && remoteNews.length > 0) {
        setNewsList(remoteNews);
        saveNewsListLocally(remoteNews);
      } else {
        // Seed default news to Firebase if empty
        INITIAL_NEWS_ITEMS.forEach((item) => {
          saveNewsItemToFirebase(item).catch(() => {});
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Update read IDs locally
  const toggleReadStatus = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let updated: string[];
    if (readIds.includes(id)) {
      updated = readIds.filter((item) => item !== id);
    } else {
      updated = [...readIds, id];
    }
    setReadIds(updated);
    saveReadNewsIdsLocally(updated);
  };

  const markAllAsRead = () => {
    const allIds = newsList.map((n) => n.id);
    setReadIds(allIds);
    saveReadNewsIdsLocally(allIds);
  };

  const handleDeleteNews = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('คุณต้องการลบประกาศข่าวสารนี้ใช่หรือไม่?')) {
      const updated = newsList.filter((item) => item.id !== id);
      setNewsList(updated);
      saveNewsListLocally(updated);
      deleteNewsItemFromFirebase(id).catch(() => {});
      if (selectedNews?.id === id) {
        setSelectedNews(null);
      }
    }
  };

  const handleCreateNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      alert('กรุณากรอกหัวข้อและเนื้อหาประกาศให้ครบถ้วน');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const tagsArray = newTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const newItem: NewsItem = {
      id: `news-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      version: newVersion.trim() || undefined,
      summary: newSummary.trim() || newContent.trim().substring(0, 100) + '...',
      content: newContent.trim(),
      author: newAuthor.trim() || 'Nan Seasons Staff',
      date: todayStr,
      pinned: newPinned,
      tags: tagsArray.length > 0 ? tagsArray : ['Announcement'],
      readBy: [],
      createdAt: Date.now(),
    };

    const updatedList = [newItem, ...newsList];
    setNewsList(updatedList);
    saveNewsListLocally(updatedList);
    saveNewsItemToFirebase(newItem).catch(() => {});

    // Reset Form
    setNewTitle('');
    setNewSummary('');
    setNewContent('');
    setNewTags('');
    setNewVersion('');
    setNewPinned(false);
    setIsAddModalOpen(false);
  };

  // Filtered list calculation
  const filteredNews = useMemo(() => {
    return newsList
      .filter((item) => {
        if (activeCategory !== 'all' && item.category !== activeCategory) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchContent = item.content.toLowerCase().includes(q);
          const matchSummary = item.summary?.toLowerCase().includes(q);
          const matchAuthor = item.author.toLowerCase().includes(q);
          const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));
          return matchTitle || matchContent || matchSummary || matchAuthor || matchTags;
        }
        return true;
      })
      .sort((a, b) => {
        // Pinned first
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.createdAt - a.createdAt;
      });
  }, [newsList, activeCategory, searchQuery]);

  const unreadCount = useMemo(() => {
    return newsList.filter((item) => !readIds.includes(item.id)).length;
  }, [newsList, readIds]);

  const getCategoryBadge = (category: NewsItem['category']) => {
    switch (category) {
      case 'system':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Sparkles className="w-3 h-3" />
            <span>อัปเดตระบบ</span>
          </span>
        );
      case 'hotel':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Megaphone className="w-3 h-3" />
            <span>ประกาศโรงแรม</span>
          </span>
        );
      case 'sop':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <BookOpen className="w-3 h-3" />
            <span>คู่มือ & SOP</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: NewsItem['priority']) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>ด่วนมาก (Urgent)</span>
          </span>
        );
      case 'important':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Info className="w-3 h-3" />
            <span>สำคัญ</span>
          </span>
        );
      case 'normal':
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                What's New & Updates
              </span>
              <span className="bg-slate-800 text-slate-300 text-xs font-mono font-semibold px-2.5 py-1 rounded-full border border-slate-700">
                System v2.5
              </span>
              {unreadCount > 0 && (
                <span className="bg-amber-500 text-slate-950 text-xs font-extrabold px-2.5 py-1 rounded-full animate-pulse shadow-md">
                  {unreadCount} ใหม่ยังไม่อ่าน
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>ข่าวสาร & อัปเดตระบบ</span>
              <span className="text-emerald-400 text-lg font-normal">Nan Seasons Hotel</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              ติดตามข่าวสารการอัปเดตระบบ ระเบียบปฏิบัติประจำกะ (SOP) และประกาศสำคัญจากฝ่ายบริหาร สำหรับพนักงานต้อนรับและทีมงาน Nan Seasons
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <CheckCheck className="w-4 h-4 text-emerald-400" />
                <span>ทำเป็นอ่านแล้วทั้งหมด</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>สร้างประกาศข่าวใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>ทั้งหมด ({newsList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('system')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeCategory === 'system'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>อัปเดตระบบ</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('hotel')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeCategory === 'hotel'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>ประกาศโรงแรม</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('sop')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeCategory === 'sop'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>คู่มือ & SOP</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาหัวข้อ เนื้อหา แท็ก..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* News Cards Grid */}
      {filteredNews.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Megaphone className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">ไม่พบประกาศหรือข่าวสารตรงกับการค้นหา</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            ลองเปลี่ยนหมวดหมู่หรือคำค้นหา หรือสร้างประกาศข่าวใหม่เพื่อแจ้งข่าวสารพนักงาน
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNews.map((item) => {
            const isRead = readIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => setSelectedNews(item)}
                className={`group bg-white dark:bg-slate-800 rounded-2xl p-5 border transition-all duration-200 hover:shadow-lg cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  item.pinned
                    ? 'border-amber-400 dark:border-amber-500/60 ring-1 ring-amber-400/30'
                    : 'border-slate-200 dark:border-slate-700/80 hover:border-emerald-500'
                } ${!isRead ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''}`}
              >
                {/* Top Badge Row */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.pinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <Pin className="w-3 h-3 fill-amber-500" />
                          <span>ปักหมุด</span>
                        </span>
                      )}
                      {getCategoryBadge(item.category)}
                      {getPriorityBadge(item.priority)}
                      {item.version && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                          {item.version}
                        </span>
                      )}
                    </div>

                    {/* Unread dot / Read toggle */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title={isRead ? 'ทําเป็นยังไม่อ่าน' : 'ทำเป็นอ่านแล้ว'}
                        onClick={(e) => toggleReadStatus(item.id, e)}
                        className={`p-1.5 rounded-lg text-xs transition-colors ${
                          isRead
                            ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700'
                            : 'text-amber-500 hover:text-amber-600 font-bold'
                        }`}
                      >
                        {isRead ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block animate-ping" />
                        )}
                      </button>
                      <button
                        type="button"
                        title="ลบประกาศ"
                        onClick={(e) => handleDeleteNews(item.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Summary */}
                  <h3
                    className={`text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 ${
                      !isRead ? 'font-extrabold' : 'font-semibold'
                    }`}
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 mb-4">
                    {item.summary || item.content}
                  </p>
                </div>

                {/* Footer Meta Row */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{item.author}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{item.date}</span>
                    </span>
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                    <span>อ่านเต็ม</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail View Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {getCategoryBadge(selectedNews.category)}
                  {getPriorityBadge(selectedNews.priority)}
                  {selectedNews.version && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {selectedNews.version}
                    </span>
                  )}
                  {selectedNews.pinned && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Pin className="w-3 h-3 fill-amber-500" />
                      <span>ปักหมุดไว้</span>
                    </span>
                  )}
                </div>
                <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 leading-snug">
                  {selectedNews.title}
                </h2>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>ผู้ประกาศ: {selectedNews.author}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>วันที่: {selectedNews.date}</span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs md:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
              {selectedNews.content}

              {/* Tags */}
              {selectedNews.tags && selectedNews.tags.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">แท็ก:</span>
                  {selectedNews.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <button
                type="button"
                onClick={(e) => toggleReadStatus(selectedNews.id, e)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle className={`w-4 h-4 ${readIds.includes(selectedNews.id) ? 'text-emerald-500' : ''}`} />
                <span>
                  {readIds.includes(selectedNews.id) ? 'ทำเป็นยังไม่อ่าน' : 'ทำเป็นอ่านแล้ว'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Announcement Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  สร้างประกาศข่าวสารใหม่
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNews} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หัวข้อประกาศ / ข่าวสาร <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น ระเบียบปฏิบัติใหม่เรื่องการส่งมอบเงินสด"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100 font-medium"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="hotel">ประกาศโรงแรม</option>
                    <option value="system">อัปเดตระบบ</option>
                    <option value="sop">คู่มือ & SOP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ความสำคัญ
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="normal">ปกติ (Normal)</option>
                    <option value="important">สำคัญ (Important)</option>
                    <option value="urgent">ด่วนมาก (Urgent)</option>
                  </select>
                </div>
              </div>

              {/* Version & Author */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เวอร์ชั่นระบบ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="เช่น v2.5"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ผู้ประกาศ / ฝ่าย
                  </label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="เช่น ฝ่ายบริหาร"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  สรุปสั้นๆ (Summary)
                </label>
                <input
                  type="text"
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="ข้อความสรุปสั้นๆ สำหรับแสดงบนการ์ด"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  เนื้อหาประกาศแบบละเอียด <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="รายละเอียดข้อความข่าวสารหรือคำแนะนำในการปฏิบัติงาน..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Tags & Pinned Checkbox */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    แท็กคำค้นหา (คั่นด้วยจุลภาค)
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="SOP, Handover, FrontOffice"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer pt-4">
                  <input
                    type="checkbox"
                    checked={newPinned}
                    onChange={(e) => setNewPinned(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>ปักหมุดไว้บนสุด</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  โพสต์ประกาศข่าว
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

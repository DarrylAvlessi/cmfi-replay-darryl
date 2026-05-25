// data/mockData.ts

import { MediaContent, User, MediaType, Comment } from '../types';

export const mockComments: Comment[] = [
  { id: 'c1', user: { name: 'Maria S.', avatarUrl: 'https://picsum.photos/seed/user2/100/100' }, text: 'This production was so insightful, thank you!', timestamp: '2 days ago', likes: 152 },
  { id: 'c2', user: { name: 'John D.', avatarUrl: 'https://picsum.photos/seed/user1/100/100' }, text: 'Powerful message. I was truly blessed.', timestamp: '1 day ago', likes: 230 },
  { id: 'c3', user: { name: 'David L.', avatarUrl: 'https://picsum.photos/seed/user3/100/100' }, text: 'Can anyone recommend a follow-up series to this one?', timestamp: '5 hours ago', likes: 45 },
  { id: 'c4', user: { name: 'Samuel P.', avatarUrl: 'https://picsum.photos/seed/user7/100/100' }, text: 'Amen! The truth of the Gospel is so clear here.', timestamp: '30 minutes ago', likes: 88 },
];

export const continueWatching: MediaContent[] = [
  {
    id: 'cw1',
    type: MediaType.Series,
    title: 'The Book of Genesis',
    author: 'Dr. John Walton',
    theme: 'Old Testament',
    imageUrl: 'https://picsum.photos/seed/genesis/400/225',
    episodes: 24,
    progress: 75,
    description: 'A deep dive into the foundational book of the Bible, exploring its historical context and theological significance.',
    languages: ['English', 'French', 'Spanish'],
    seasons: [
      { 
        seasonNumber: 1, 
        episodes: Array.from({ length: 12 }, (_, i) => ({
          episodeNumber: i + 1,
          title: `Creation and Fall - Ch. ${i + 1}`,
          duration: `${Math.floor(Math.random() * 15) + 40} min`,
          thumbnailUrl: `https://picsum.photos/seed/genesis-s1-e${i+1}/400/225`,
          views: Math.floor(Math.random() * 50000) + 10000,
          likes: Math.floor(Math.random() * 5000) + 1000,
          comments: mockComments.slice(0, Math.floor(Math.random() * 4) + 1),
        })),
      },
      { 
        seasonNumber: 2, 
        episodes: Array.from({ length: 12 }, (_, i) => ({
          episodeNumber: i + 1,
          title: `The Patriarchs - Ch. ${i + 13}`,
          duration: `${Math.floor(Math.random() * 15) + 42} min`,
          thumbnailUrl: `https://picsum.photos/seed/genesis-s2-e${i+1}/400/225`,
          views: Math.floor(Math.random() * 30000) + 5000,
          likes: Math.floor(Math.random() * 3000) + 500,
          comments: mockComments.slice(0, Math.floor(Math.random() * 3) + 1),
        })),
      },
    ],
  },
  {
    id: 'cw2',
    type: MediaType.Movie,
    title: 'The Rise of Christianity',
    theme: 'Church History',
    imageUrl: 'https://picsum.photos/seed/christianity/400/225',
    duration: '1h 45m',
    progress: 40,
    description: 'Follow the incredible story of how a small sect in Judea grew into a global faith over centuries of persecution and triumph.',
    languages: ['English', 'German'],
    views: 120543,
    likes: 12500,
    comments: mockComments.slice(0,2),
  },
];

export const popularSeries: MediaContent[] = [
  {
    id: 's1',
    type: MediaType.Series,
    title: 'Parables of Jesus Explained',
    author: 'Pastor Chuck Smith',
    theme: 'New Testament',
    imageUrl: 'https://picsum.photos/seed/parables/600/338',
    episodes: 12,
    description: 'Unpack the rich meanings behind the simple stories Jesus told. Each episode focuses on a different parable and its application for today.',
    languages: ['English', 'French'],
    seasons: [{ 
      seasonNumber: 1, 
      episodes: Array.from({ length: 12 }, (_, i) => ({
        episodeNumber: i + 1,
        title: `Parable of the Sower - Pt. ${i + 1}`,
        duration: `${Math.floor(Math.random() * 10) + 25} min`,
        thumbnailUrl: `https://picsum.photos/seed/parables-s1-e${i+1}/400/225`,
        views: Math.floor(Math.random() * 80000) + 20000,
        likes: Math.floor(Math.random() * 8000) + 2000,
        comments: mockComments.slice(0, Math.floor(Math.random() * 4)),
      })),
    }],
  },
  {
    id: 's2',
    type: MediaType.Series,
    title: 'Prayer that Moves Mountains',
    author: 'Maria Anges',
    theme: 'Prayer',
    imageUrl: 'https://picsum.photos/seed/prayer/300/450',
    episodes: 8,
    description: 'Discover the power of earnest prayer through biblical examples and practical guidance. This series will transform your prayer life.',
    languages: ['English', 'Spanish'],
    seasons: [{ 
      seasonNumber: 1, 
      episodes: Array.from({ length: 8 }, (_, i) => ({
        episodeNumber: i + 1,
        title: `The Foundation of Prayer ${i + 1}`,
        duration: `${Math.floor(Math.random() * 12) + 30} min`,
        thumbnailUrl: `https://picsum.photos/seed/prayer-s1-e${i+1}/400/225`,
        views: Math.floor(Math.random() * 60000) + 15000,
        likes: Math.floor(Math.random() * 6000) + 1500,
      })),
    }],
  },
  {
    id: 's3',
    type: MediaType.Series,
    title: 'Foundations of Faith',
    author: 'Alistair Begg',
    theme: 'Theology',
    imageUrl: 'https://picsum.photos/seed/faith/300/450',
    episodes: 30,
    description: 'A comprehensive series covering the core doctrines of the Christian faith, perfect for new believers and seasoned saints alike.',
    languages: ['English'],
    seasons: [
      { 
        seasonNumber: 1, 
        episodes: Array.from({ length: 10 }, (_, i) => ({ episodeNumber: i + 1, title: `Doctrine of God - Part ${i + 1}`, duration: `${Math.floor(Math.random() * 15) + 50} min`, thumbnailUrl: `https://picsum.photos/seed/faith-s1-e${i+1}/400/225`, })),
      },
      { 
        seasonNumber: 2, 
        episodes: Array.from({ length: 10 }, (_, i) => ({ episodeNumber: i + 1, title: `Doctrine of Christ - Part ${i + 1}`, duration: `${Math.floor(Math.random() * 15) + 52} min`, thumbnailUrl: `https://picsum.photos/seed/faith-s2-e${i+1}/400/225`, })),
      },
      { 
        seasonNumber: 3, 
        episodes: Array.from({ length: 10 }, (_, i) => ({ episodeNumber: i + 1, title: `Doctrine of Salvation - Part ${i + 1}`, duration: `${Math.floor(Math.random() * 15) + 55} min`, thumbnailUrl: `https://picsum.photos/seed/faith-s3-e${i+1}/400/225`, })),
      },
    ],
  },
  {
    id: 's4',
    type: MediaType.Series,
    title: 'The Missionary Journey',
    author: 'Paul Washer',
    theme: 'Mission',
    imageUrl: 'https://picsum.photos/seed/mission/300/450',
    episodes: 5,
    description: 'Explore the history and future of Christian missions, from the Apostle Paul to the unreached people groups of the 21st century.',
    languages: ['English', 'Portuguese'],
    seasons: [{ 
      seasonNumber: 1, 
      episodes: Array.from({ length: 5 }, (_, i) => ({ episodeNumber: i + 1, title: `The Call to Go - Ep. ${i + 1}`, duration: `${Math.floor(Math.random() * 10) + 45} min`, thumbnailUrl: `https://picsum.photos/seed/mission-s1-e${i+1}/400/225`, })),
    }],
  },
];

export const newMovies: MediaContent[] = [
  {
    id: 'd1',
    type: MediaType.Movie,
    title: 'In His Steps: A Journey Through Israel',
    theme: 'Biblical Archaeology',
    imageUrl: 'https://picsum.photos/seed/israel/600/338',
    duration: '2h 15m',
    description: 'Walk the lands of the Bible and see the historical places where Jesus and the prophets lived and ministered. A visually stunning and faith-affirming experience.',
    languages: ['English', 'French', 'Hebrew'],
    views: 250123,
    likes: 28400,
    comments: mockComments,
  },
  {
    id: 'd2',
    type: MediaType.Movie,
    title: 'The Reformation Story',
    theme: 'Church History',
    imageUrl: 'https://picsum.photos/seed/reformation/600/338',
    duration: '1h 55m',
    description: 'A gripping look at the key figures and events of the Protestant Reformation, from Martin Luther to John Calvin.',
    languages: ['English', 'German', 'French'],
    views: 98000,
    likes: 9500,
    comments: mockComments.slice(1,3),
  },
];

export const featuredPodcasts: MediaContent[] = [
  {
    id: 'p1',
    type: MediaType.Podcast,
    title: 'Daily Grace',
    author: 'Christy Wright',
    theme: 'Devotionals',
    imageUrl: 'https://picsum.photos/seed/grace/200/200',
    duration: '25 min',
    description: 'Start your day with a short, encouraging word. Daily Grace provides a moment of peace and reflection in a busy world.',
    languages: ['English'],
    views: 150000,
    likes: 18000,
  },
  {
    id: 'p2',
    type: MediaType.Podcast,
    title: 'Theology on the Go',
    author: 'Jonathan Master',
    theme: 'Theology',
    imageUrl: 'https://picsum.photos/seed/theology/200/200',
    duration: '45 min',
    description: 'Tackling tough theological questions in an accessible and engaging format. Perfect for your commute or workout.',
    languages: ['English'],
    views: 75000,
    likes: 8200,
  },
  {
    id: 'p3',
    type: MediaType.Podcast,
    title: 'Missions Today',
    author: 'Various Hosts',
    theme: 'Mission',
    imageUrl: 'https://picsum.photos/seed/missionspod/200/200',
    duration: '35 min',
    description: 'Hear inspiring stories from missionaries on the field and learn how you can get involved in the Great Commission.',
    languages: ['English', 'Spanish'],
  },
];

export const featuredContent: MediaContent[] = [
  newMovies[0],
  popularSeries[0],
  newMovies[1],
];

export const mostWatched: MediaContent[] = [
  popularSeries[0],
  newMovies[1],
  popularSeries[2],
  featuredPodcasts[1],
];

export const mostLiked: MediaContent[] = [
  newMovies[0],
  popularSeries[1],
  popularSeries[3],
  featuredPodcasts[2],
];

export const history: MediaContent[] = [
    continueWatching[1],
    popularSeries[3],
    featuredPodcasts[0],
];

export const allContent: MediaContent[] = [
  ...continueWatching,
  ...popularSeries,
  ...newMovies,
  ...featuredPodcasts
];

export const activeUsers: User[] = [
  { id: 'u1', name: 'John D.', avatarUrl: 'https://picsum.photos/seed/user1/100/100', isOnline: true },
  { id: 'u2', name: 'Maria S.', avatarUrl: 'https://picsum.photos/seed/user2/100/100', isOnline: true },
  { id: 'u3', name: 'David L.', avatarUrl: 'https://picsum.photos/seed/user3/100/100', isOnline: true },
  { id: 'u4', name: 'Sarah K.', avatarUrl: 'https://picsum.photos/seed/user4/100/100', isOnline: false },
  { id: 'u5', name: 'Paul M.', avatarUrl: 'https://picsum.photos/seed/user5/100/100', isOnline: true },
  { id: 'u6', name: 'Esther B.', avatarUrl: 'https://picsum.photos/seed/user6/100/100', isOnline: false },
  { id: 'u7', name: 'Samuel P.', avatarUrl: 'https://picsum.photos/seed/user7/100/100', isOnline: true },
];

export const themes: string[] = ['Evangelism', 'Biblical Teaching', 'Prayer', 'Mission', 'Church History', 'Theology', 'Old Testament', 'New Testament'];
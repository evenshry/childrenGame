import React, { lazy, Suspense } from 'react';
import { createHashRouter } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Spin } from 'antd';

const Home = lazy(() => import('@/pages/Home'));
const Game = lazy(() => import('@/pages/Game'));
const Levels = lazy(() => import('@/pages/Levels'));
const Achievements = lazy(() => import('@/pages/Achievements'));
const Concepts = lazy(() => import('@/pages/Concepts'));
const LevelEditor = lazy(() => import('@/pages/LevelEditor'));

const LoadingFallback: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
    <Spin size="large" />
  </div>
);

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: 'game',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Game />
          </Suspense>
        ),
      },
      {
        path: 'levels',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Levels />
          </Suspense>
        ),
      },
      {
        path: 'editor',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <LevelEditor />
          </Suspense>
        ),
      },
      {
        path: 'achievements',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Achievements />
          </Suspense>
        ),
      },
      {
        path: 'concepts',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Concepts />
          </Suspense>
        ),
      },
    ],
  },
]);

import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Library from './pages/Library';
import Search from './pages/Search';
import SeriesDetailPage from './pages/SeriesDetail';
import SeasonView from './pages/SeasonView';
import EpisodeDetailPage from './pages/EpisodeDetail';
import WatchHistoryPage from './pages/WatchHistory';
import TagAdminPage from './pages/TagAdmin';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/suche" element={<Search />} />
        <Route path="/serie/:id" element={<SeriesDetailPage />} />
        <Route path="/serie/:seriesId/staffel/:seasonId" element={<SeasonView />} />
        <Route path="/episode/:id" element={<EpisodeDetailPage />} />
        <Route path="/verlauf" element={<WatchHistoryPage />} />
        <Route path="/tags" element={<TagAdminPage />} />
      </Routes>
    </Layout>
  );
}

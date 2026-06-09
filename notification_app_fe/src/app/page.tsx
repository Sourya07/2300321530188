'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
  Alert,
  Card,
  CardContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarsIcon from '@mui/icons-material/Stars';
import CampaignIcon from '@mui/icons-material/Campaign';

import Header from '@/components/Header';
import NotificationCard from '@/components/NotificationCard';
import {
  getNotifications,
  getNotificationStats,
  getPriorityNotifications,
  markNotificationAsRead,
  Notification,
} from '@/services/api';

export default function Home() {
  const [tab, setTab] = useState<'all' | 'priority'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Stats
  const [unreadCount, setUnreadCount] = useState(0);
  const [placementCount, setPlacementCount] = useState(0);
  const [resultCount, setResultCount] = useState(0);

  // Fetch notifications
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'all') {
        const filterVal = typeFilter === 'all' ? undefined : typeFilter;
        const res = await getNotifications(page, limit, filterVal);
        setNotifications(res.notifications);
        setTotal(res.total);
      } else {
        const priorityData = await getPriorityNotifications();
        setNotifications(priorityData);
        setTotal(priorityData.length);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [tab, page, limit, typeFilter]);

  // Fetch count statistics from the backend summary endpoint.
  const loadStats = useCallback(async () => {
    try {
      const stats = await getNotificationStats();
      setUnreadCount(stats.unread);
      setPlacementCount(stats.placements);
      setResultCount(stats.results);
    } catch {
      setError('Notifications loaded, but dashboard statistics are unavailable.');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStats();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadStats]);

  // Handle Mark Read
  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      // Update locally
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isViewed: true } : n))
      );
      // Decrement unread counter
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
    }
  };

  // Handle Mark All Read
  const handleMarkAllRead = async () => {
    try {
      const unreadList = notifications.filter((n) => !n.isViewed);
      await Promise.all(unreadList.map((n) => markNotificationAsRead(n.id)));
      setNotifications((prev) => prev.map((n) => ({ ...n, isViewed: true })));
      setUnreadCount(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
    }
  };

  // Filters
  const handleTypeChange = (event: SelectChangeEvent) => {
    setTypeFilter(event.target.value);
    setPage(1); // Reset to first page
  };

  const handleLimitChange = (event: SelectChangeEvent) => {
    setLimit(parseInt(event.target.value));
    setPage(1); // Reset to first page
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Header currentTab={tab} setTab={setTab} unreadCount={unreadCount} />

      <Container maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 3, md: 5 } }}>
        {/* Banner Card / Stats Panel */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, mb: 4 }}>
          <Box sx={{ flex: 1 }}>
            <Card sx={{ background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.18), #090909 68%)', height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                  <CampaignIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    New Announcements
                  </Typography>
                  <Typography variant="h4" color="primary.light">
                    {unreadCount}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Card sx={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.17), #090909 68%)', height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                  <TrendingUpIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Active Placements
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {placementCount}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Card sx={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.17), #090909 68%)', height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                  <StarsIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Recent Results
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {resultCount}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Filters and Controls */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            mb: 3.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Typography variant="h5" component="h2">
              {tab === 'all' ? 'All Notifications' : 'Priority Board (Top 10)'}
            </Typography>
            <Tooltip title="Refresh Feed">
              <IconButton onClick={() => { loadData(); loadStats(); }} size="small" color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {tab === 'all' && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="type-filter-label">Filter Type</InputLabel>
                <Select
                  labelId="type-filter-label"
                  value={typeFilter}
                  label="Filter Type"
                  onChange={handleTypeChange}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="Placement">Placements</MenuItem>
                  <MenuItem value="Result">Results</MenuItem>
                  <MenuItem value="Event">Events</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel id="limit-select-label">Show</InputLabel>
                <Select
                  labelId="limit-select-label"
                  value={String(limit)}
                  label="Show"
                  onChange={handleLimitChange}
                >
                  <MenuItem value="5">5 items</MenuItem>
                  <MenuItem value="10">10 items</MenuItem>
                  <MenuItem value="20">20 items</MenuItem>
                  <MenuItem value="50">50 items</MenuItem>
                </Select>
              </FormControl>

              {unreadCount > 0 && (
                <Button
                  variant="outlined"
                  color="secondary"
                  size="medium"
                  startIcon={<MarkEmailReadIcon />}
                  onClick={handleMarkAllRead}
                >
                  Mark All Read
                </Button>
              )}
            </Box>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} action={
            <Button color="inherit" size="small" onClick={loadData}>
              Retry
            </Button>
          }>
            {error}
          </Alert>
        )}

        {/* Content Listing */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress size={48} thickness={4.5} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, bgcolor: '#070707', borderRadius: 4, border: '1px dashed rgba(255,255,255,0.14)' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No notifications found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Check back later or change your filters to see recent updates.
            </Typography>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {notifications.map((n) => (
                <NotificationCard key={n.id} notification={n} onMarkRead={handleMarkRead} />
              ))}
            </Box>

            {/* Pagination Controls */}
            {tab === 'all' && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={Math.max(1, Math.ceil(total / limit))}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}

'use client';

import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, Chip, Button } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import WorkIcon from '@mui/icons-material/Work';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EventIcon from '@mui/icons-material/Event';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import { Notification } from '@/services/api';

interface NotificationCardProps {
  notification: Notification;
  onMarkRead: (id: string) => Promise<void>;
}

export default function NotificationCard({ notification, onMarkRead }: NotificationCardProps) {
  const [loading, setLoading] = useState(false);

  const handleMarkRead = async () => {
    setLoading(true);
    try {
      await onMarkRead(notification.id);
    } catch {
      // The parent owns request error presentation.
    } finally {
      setLoading(false);
    }
  };

  // Icon and Color based on notification type
  const getTypeConfig = (type: Notification['type']) => {
    switch (type) {
      case 'Placement':
        return {
          color: 'success' as const,
          icon: <WorkIcon sx={{ fontSize: 18 }} />,
          bgColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: 'rgba(16, 185, 129, 0.2)',
        };
      case 'Result':
        return {
          color: 'warning' as const,
          icon: <AssessmentIcon sx={{ fontSize: 18 }} />,
          bgColor: 'rgba(245, 158, 11, 0.1)',
          borderColor: 'rgba(245, 158, 11, 0.2)',
        };
      case 'Event':
      default:
        return {
          color: 'info' as const,
          icon: <EventIcon sx={{ fontSize: 18 }} />,
          bgColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 0.2)',
        };
    }
  };

  const config = getTypeConfig(notification.type);
  const formattedTime = new Date(notification.timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Card
      sx={{
        position: 'relative',
        transition: 'all 0.3s ease',
        background: notification.isViewed ? '#070707' : '#0d0d0d',
        border: notification.isViewed
          ? '1px solid rgba(255, 255, 255, 0.07)'
          : `1px solid ${config.borderColor}`,
        boxShadow: notification.isViewed ? 'none' : '0 14px 36px rgba(0, 0, 0, 0.42)',
        '&:hover': {
          transform: 'translateY(-2px)',
          background: '#111111',
          boxShadow: '0 18px 42px rgba(0, 0, 0, 0.55)',
          border: `1px solid ${config.borderColor}`,
        },
      }}
    >
      {/* Unread indicator top border */}
      {!notification.isViewed && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(to right, ${config.color === 'success' ? '#10b981' : config.color === 'warning' ? '#f59e0b' : '#3b82f6'}, transparent)`,
          }}
        />
      )}

      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={config.icon}
              label={notification.type}
              color={config.color}
              size="small"
              sx={{ fontWeight: 600, height: 24 }}
            />
            {notification.priorityScore !== undefined && (
              <Chip
                icon={<StarIcon sx={{ fontSize: '14px !important', color: '#f59e0b' }} />}
                label={`Priority: ${notification.priorityScore}`}
                size="small"
                variant="outlined"
                sx={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b', fontWeight: 600, height: 24 }}
              />
            )}
            {!notification.isViewed && (
              <Chip
                icon={<FiberNewIcon sx={{ fontSize: '18px !important' }} />}
                label="NEW"
                color="secondary"
                size="small"
                sx={{ height: 24, fontWeight: 700 }}
              />
            )}
          </Box>

          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {formattedTime}
          </Typography>
        </Box>

        <Typography variant="body1" sx={{ color: notification.isViewed ? 'text.secondary' : 'text.primary', fontWeight: notification.isViewed ? 400 : 500, mb: 2 }}>
          {notification.message}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {notification.isViewed ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: '0.85rem' }}>
              <VisibilityIcon sx={{ fontSize: 16 }} />
              Viewed
            </Box>
          ) : (
            <Button
              variant="outlined"
              size="small"
              color={config.color}
              disabled={loading}
              onClick={handleMarkRead}
              startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
              sx={{
                fontSize: '0.75rem',
                py: 0.5,
                px: 1.5,
                borderWidth: '1.5px',
                '&:hover': {
                  borderWidth: '1.5px',
                },
              }}
            >
              Mark Read
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

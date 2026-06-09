'use client';

import React from 'react';
import { AppBar, Toolbar, Typography, Container, Box, Button, Badge, Chip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import StarIcon from '@mui/icons-material/Star';
import ListAltIcon from '@mui/icons-material/ListAlt';

interface HeaderProps {
  currentTab: 'all' | 'priority';
  setTab: (tab: 'all' | 'priority') => void;
  unreadCount: number;
}

export default function Header({ currentTab, setTab, unreadCount }: HeaderProps) {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'rgba(0, 0, 0, 0.86)',
        backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between', py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
                borderRadius: '50%',
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 24px rgba(124, 58, 237, 0.38)',
              }}
            >
              <NotificationsIcon sx={{ color: '#fff' }} />
            </Box>
            <Box>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 700, color: '#fff' }}>
                Campus Hub
              </Typography>
              <Chip label="Hiring Process" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600, px: 0.5 }} />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1.5 } }}>
            <Button
              aria-label="All Notifications"
              variant={currentTab === 'all' ? 'contained' : 'text'}
              color="primary"
              onClick={() => setTab('all')}
              startIcon={<ListAltIcon />}
              sx={{
                px: { xs: 1.25, sm: 2 },
                py: 0.8,
                bgcolor: currentTab === 'all' ? 'primary.main' : 'transparent',
                color: currentTab === 'all' ? '#fff' : 'text.secondary',
                '&:hover': {
                  bgcolor: currentTab === 'all' ? 'primary.dark' : 'rgba(255, 255, 255, 0.07)',
                },
                '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                All Notifications
              </Box>
            </Button>
            <Badge badgeContent={unreadCount} color="secondary" max={99}>
              <Button
                aria-label="Priority View"
                variant={currentTab === 'priority' ? 'contained' : 'text'}
                color="secondary"
                onClick={() => setTab('priority')}
                startIcon={<StarIcon />}
                sx={{
                  px: { xs: 1.25, sm: 2 },
                  py: 0.8,
                  bgcolor: currentTab === 'priority' ? 'secondary.main' : 'transparent',
                  color: currentTab === 'priority' ? '#fff' : 'text.secondary',
                  '&:hover': {
                    bgcolor: currentTab === 'priority' ? 'secondary.dark' : 'rgba(255, 255, 255, 0.07)',
                  },
                  '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Priority View
                </Box>
              </Button>
            </Badge>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

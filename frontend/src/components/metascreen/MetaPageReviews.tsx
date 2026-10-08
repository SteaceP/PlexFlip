import React, { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Rating,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { EditRounded, RateReviewRounded } from "@mui/icons-material";
import { motion } from "framer-motion";
import moment from "moment";
import { PlexCommunity } from "../../plex/plexCommunity";
import { getPlexFlipReviews } from "../../common/PlexFlipReviews";
import { useUserSessionStore } from "../../states/UserSession";
import AddReviewModal from "../modals/AddReviewModal";

export interface MetaPageReviewsProps {
  data: Plex.Metadata | undefined;
}

export function MetaPageReviews({ data }: MetaPageReviewsProps) {
  const [reviews, setReviews] = useState<
    | (PlexCommunity.ReviewsData & {
        plexFlipReviews: PlexFlip.Reviews.Review[];
      })
    | null
  >(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const currentUser = useUserSessionStore((state) => state.user);

  const fetchReviews = useCallback(async () => {
    if (!data) return;
    setLoading(true);
    const metaID = data.guid?.split("/").pop();

    try {
      const [communityRes, plexFlipReviews] = await Promise.all([
        metaID
          ? PlexCommunity.getUserReviews(metaID).catch((err) => {
              console.warn("Could not load Plex Community reviews:", err);
              return null;
            })
          : Promise.resolve(null),
        data.guid
          ? getPlexFlipReviews(data.guid).catch((err) => {
              console.warn("Could not load PlexFlip reviews:", err);
              return [];
            })
          : Promise.resolve([]),
      ]);

      const emptySection: PlexCommunity.ReviewsSection = {
        nodes: [],
        pageInfo: { hasNextPage: false },
        title: "",
      };
      const baseRes: PlexCommunity.ReviewsData = communityRes || {
        userReview: null,
        topReviews: emptySection,
        recentReviews: emptySection,
        friendReviews: emptySection,
        hotReviews: emptySection,
        otherReviews: emptySection,
      };

      if (baseRes.recentReviews?.nodes) {
        baseRes.recentReviews.nodes =
          baseRes.recentReviews.nodes.filter(
            (review) =>
              baseRes.topReviews?.nodes.find(
                (topReview) => topReview.id === review.id
              ) === undefined
          ) ?? [];
      }

      setReviews({
        ...baseRes,
        plexFlipReviews: plexFlipReviews || [],
      });
    } catch (e) {
      console.error("Failed to load reviews:", e);
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const renderReviewsSection = (
    title: string,
    reviewNodes: any[] | undefined,
    isEmpty: boolean,
    isPlexFlip: boolean = false
  ) => {
    if (isEmpty) return null;
    return (
      <Box sx={{ width: "100%", mb: 5 }}>
        <Typography
          variant="h6"
          fontWeight="bold"
          color="text.primary"
          sx={{ mb: 2 }}
        >
          {title}
        </Typography>

        {reviewNodes && reviewNodes.length > 0 ? (
          <Grid container spacing={3} sx={{ width: "100%" }}>
            {reviewNodes?.map((review, index) => {
              const username = isPlexFlip
                ? (review as PlexFlip.Reviews.Review).user?.username
                : (review as PlexCommunity.ActivityReview).userV2?.username;

              const avatarSrc = isPlexFlip
                ? (review as PlexFlip.Reviews.Review).user?.avatar
                : (review as PlexCommunity.ActivityReview).userV2?.avatar;

              const hasSpoilers = isPlexFlip
                ? (review as PlexFlip.Reviews.Review).spoilers
                : (review as PlexCommunity.ActivityReview).hasSpoilers;

              const reviewDate = isPlexFlip
                ? (review as PlexFlip.Reviews.Review).created_at
                : (review as PlexCommunity.ActivityReview).date;

              const isCurrentUser =
                isPlexFlip &&
                Boolean(
                  currentUser?.uuid &&
                    ((review as PlexFlip.Reviews.Review).userID ===
                      currentUser.uuid ||
                      (review as PlexFlip.Reviews.Review).user?.id ===
                        currentUser.uuid)
                );

              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={title + index}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      bgcolor: (theme) =>
                        alpha(theme.palette.background.paper, 0.4),
                      borderRadius: 2,
                      height: "100%",
                      transition: "all 0.2s ease",
                      border: isCurrentUser
                        ? (theme) =>
                            `1px solid ${alpha(theme.palette.primary.main, 0.4)}`
                        : undefined,
                      "&:hover": {
                        bgcolor: (theme) =>
                          alpha(theme.palette.background.paper, 0.6),
                        transform: "translateY(-4px)",
                        boxShadow: (theme) =>
                          `0 8px 16px -2px ${alpha(
                            theme.palette.common.black,
                            0.15
                          )}`,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: 2,
                        position: "relative",
                      }}
                    >
                      <Avatar
                        src={avatarSrc}
                        sx={{ width: 42, height: 42, boxShadow: 1 }}
                      >
                        {username?.charAt(0) || "U"}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack
                          spacing={0.5}
                          justifyContent={"flex-start"}
                          direction={"row"}
                          alignItems="center"
                        >
                          <Typography fontWeight="medium" noWrap>
                            {username || "Anonymous User"}
                          </Typography>
                          {isCurrentUser && (
                            <Chip
                              label="You"
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{
                                height: 20,
                                fontSize: "0.7rem",
                                fontWeight: "bold",
                              }}
                            />
                          )}
                          {review.visibility === "GLOBAL" && (
                            <Chip label="Global" size="small" color="info" />
                          )}
                          {review.visibility === "LOCAL" && (
                            <Chip label="Local" size="small" color="info" />
                          )}
                        </Stack>

                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Rating
                            value={(review.reviewRating ?? review.rating) / 2}
                            precision={0.5}
                            size="small"
                            readOnly
                            sx={{
                              color: (theme) => theme.palette.primary.main,
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{ ml: 1, color: "text.secondary" }}
                          >
                            {moment(new Date(reviewDate)).fromNow()}
                          </Typography>
                        </Box>
                      </Box>
                      {isCurrentUser && (
                        <Tooltip title="Edit your review">
                          <IconButton
                            size="small"
                            onClick={() => setReviewModalOpen(true)}
                            sx={{
                              color: "primary.main",
                              "&:hover": {
                                bgcolor: (theme) =>
                                  alpha(theme.palette.primary.main, 0.1),
                              },
                            }}
                          >
                            <EditRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Typography
                      sx={{
                        fontSize: "0.95rem",
                        color: "text.secondary",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 5,
                        WebkitBoxOrient: "vertical",
                        lineHeight: 1.6,

                        ...(hasSpoilers && {
                          filter: "blur(10px)",
                          transition: "filter 0.2s ease",
                          "&:hover": {
                            filter: "blur(0)",
                            transition: "filter 3s ease",
                          },
                        }),
                      }}
                    >
                      {review.message || "No review text provided."}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 4,
              width: "100%",
              bgcolor: (theme) => alpha(theme.palette.background.paper, 0.2),
              borderRadius: 2,
            }}
          >
            <Typography color="text.secondary" variant="body2">
              No reviews available in this category
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const totalReviews =
    (reviews?.topReviews?.nodes.length ?? 0) +
    (reviews?.friendReviews?.nodes.length ?? 0) +
    (reviews?.recentReviews?.nodes.length ?? 0) +
    (reviews?.plexFlipReviews?.length ?? 0);

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        gap: 4,
        userSelect: "none",
      }}
    >
      {reviewModalOpen && data && (
        <AddReviewModal
          item={data}
          onClose={() => setReviewModalOpen(false)}
          onSuccess={fetchReviews}
        />
      )}

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="h5" fontWeight="bold" color="text.primary">
          Reviews
        </Typography>
        <Button
          variant="contained"
          startIcon={<RateReviewRounded />}
          onClick={() => setReviewModalOpen(true)}
          sx={{
            fontWeight: "bold",
            borderRadius: 2,
            px: 2.5,
            py: 0.8,
            textTransform: "none",
            bgcolor: (theme) => theme.palette.primary.main,
            color: "#000",
            "&:hover": {
              bgcolor: (theme) => theme.palette.primary.dark,
            },
          }}
        >
          Write a Review
        </Button>
      </Box>

      {loading ? (
        <Grid container spacing={3} sx={{ width: "100%" }}>
          {[1, 2, 3].map((item) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: (theme) =>
                    alpha(theme.palette.background.paper, 0.4),
                  borderRadius: 2,
                  height: "100%",
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
                >
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="70%" height={24} />
                    <Skeleton variant="text" width="40%" height={20} />
                  </Box>
                </Box>
                <Skeleton variant="text" />
                <Skeleton variant="text" />
                <Skeleton variant="text" width="80%" />
              </Box>
            </Grid>
          ))}
        </Grid>
      ) : totalReviews === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 6,
            width: "100%",
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.2),
            borderRadius: 2,
            textAlign: "center",
            gap: 2,
          }}
        >
          <RateReviewRounded
            sx={{ fontSize: 56, color: "text.disabled" }}
          />
          <Typography color="text.secondary" variant="body1">
            No one has reviewed this title yet. Be the first to share your review!
          </Typography>
          <Button
            variant="contained"
            startIcon={<RateReviewRounded />}
            onClick={() => setReviewModalOpen(true)}
            sx={{
              fontWeight: "bold",
              borderRadius: 2,
              px: 3,
              py: 1,
              textTransform: "none",
              bgcolor: (theme) => theme.palette.primary.main,
              color: "#000",
              "&:hover": {
                bgcolor: (theme) => theme.palette.primary.dark,
              },
            }}
          >
            Write a Review
          </Button>
        </Box>
      ) : (
        <Box sx={{ width: "100%" }}>
          {renderReviewsSection(
            "PlexFlip Reviews",
            reviews?.plexFlipReviews,
            !reviews?.plexFlipReviews?.length,
            true
          )}

          {renderReviewsSection(
            "Recent Reviews",
            reviews?.recentReviews?.nodes,
            !reviews?.recentReviews?.nodes?.length
          )}

          {renderReviewsSection(
            "Top Reviews",
            reviews?.topReviews?.nodes,
            !reviews?.topReviews?.nodes?.length
          )}

          {renderReviewsSection(
            "Friend Reviews",
            reviews?.friendReviews?.nodes,
            !reviews?.friendReviews?.nodes?.length
          )}
        </Box>
      )}
    </Box>
  );
}

export default MetaPageReviews;

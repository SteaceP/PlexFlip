import React, { useEffect, useState } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Rating,
  Stack,
  Divider,
  CircularProgress,
  Select,
  MenuItem,
} from "@mui/material";
import { Star, StarBorder } from "@mui/icons-material";
import { setMediaRating } from "../../plex";
import {
  deletePlexFlipReview,
  getPlexFlipReviews,
  updatePlexFlipReview,
} from "../../common/PlexFlipReviews";
import { useUserSessionStore } from "../../states/UserSession";

interface AddReviewModalProps {
  item: Plex.Metadata;
  onClose: () => void;
  initialRating?: number;
  onSuccess?: () => void;
}

function AddReviewModal({
  item,
  onClose,
  initialRating,
  onSuccess,
}: AddReviewModalProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [existingReview, setExistingReview] =
    useState<PlexFlip.Reviews.Review | null>(null);
  const [rating, setRating] = useState<number>(
    initialRating !== undefined
      ? initialRating
      : item.userRating
      ? item.userRating / 2
      : 0
  );
  const [reviewText, setReviewText] = useState<string>("");
  const [isSpoiler, setIsSpoiler] = useState<boolean>(false);
  const [visibility, setVisibility] = useState<string>("GLOBAL");

  const handleSave = async () => {
    setIsLoading(true);
    setLoadError(null);

    // Best-effort local PMS rating if ratingKey is local numeric ID
    if (item.ratingKey && /^\d+$/.test(item.ratingKey)) {
      try {
        await setMediaRating(rating * 2, item.ratingKey).catch(() => {});
      } catch (e) {
        console.warn("Could not set local media rating:", e);
      }
    }

    const trimmedMsg = reviewText.trim();
    const finalMsg = trimmedMsg || "No text provided";

    const targetVisibility = existingReview
      ? existingReview.visibility
      : (visibility as "GLOBAL" | "LOCAL");

    const res = await updatePlexFlipReview(
      item.guid,
      rating * 2,
      finalMsg,
      targetVisibility,
      isSpoiler
    );

    if (res && res.error) {
      setLoadError(typeof res.error === "string" ? res.error : "Failed to save review");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!existingReview) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      await deletePlexFlipReview(
        existingReview.itemID,
        existingReview.visibility
      );
      if (item.ratingKey && /^\d+$/.test(item.ratingKey)) {
        await setMediaRating(-1, item.ratingKey).catch(() => {});
      }
      setIsLoading(false);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (e: any) {
      setLoadError(e?.message || "Failed to delete review");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function fetchReview() {
      if (!item.ratingKey && !item.guid) return;
      setIsLoading(true);
      try {
        const currentUser = useUserSessionStore.getState().user;
        const currentUserId = currentUser?.uuid;
        const reviews = await getPlexFlipReviews(
          item.guid,
          currentUserId
        );

        // Find review specifically authored by the current user
        const userReview = reviews.find(
          (r) =>
            (currentUserId && r.userID === currentUserId) ||
            (currentUserId && r.user?.id === currentUserId)
        );

        if (userReview) {
          setExistingReview(userReview);
          setRating((userReview.rating ?? 0) / 2);
          setReviewText(userReview.message || "");
          setIsSpoiler(userReview.spoilers || false);
          setVisibility(userReview.visibility || "GLOBAL");
        } else {
          setExistingReview(null);
          if (initialRating !== undefined) {
            setRating(initialRating);
          } else if (item.userRating) {
            setRating(item.userRating / 2);
          }
        }
      } catch (error) {
        console.error("Error fetching review:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReview();
  }, [item, initialRating]);

  return (
    <Modal
      open={true}
      onClose={onClose}
      aria-labelledby="add-review-modal-title"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: 520 },
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 3.5,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <Typography
          id="add-review-modal-title"
          variant="h6"
          component="h2"
          fontWeight="bold"
        >
          {existingReview ? "Edit Review" : "Add Review"}
        </Typography>

        <Typography variant="subtitle1" color="text.secondary" gutterBottom noWrap>
          {item.title}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {loadError && (
          <Box
            sx={{
              p: 1.5,
              mb: 2.5,
              borderRadius: 1.5,
              bgcolor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#FCA5A5",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2">{loadError}</Typography>
            <Button
              size="small"
              color="inherit"
              onClick={() => setLoadError(null)}
              sx={{ minWidth: "auto", p: 0.5 }}
            >
              ✕
            </Button>
          </Box>
        )}

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress size={36} />
          </Box>
        ) : (
          <Stack spacing={2.5}>
            <Box>
              <Typography component="legend" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Rating
              </Typography>
              <Rating
                name="review-rating"
                value={rating}
                precision={0.5}
                size="large"
                onChange={(_, newValue) => {
                  setRating(newValue || 0);
                }}
                icon={<Star fontSize="inherit" sx={{ color: "#e5a00d" }} />}
                emptyIcon={<StarBorder fontSize="inherit" />}
              />
            </Box>

            <TextField
              label="Review (Optional)"
              multiline
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your thoughts about this title..."
              variant="outlined"
              fullWidth
              slotProps={{
                htmlInput: { maxLength: 500 },
              }}
              helperText={`${reviewText.length}/500 characters`}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={isSpoiler}
                  onChange={(e) => setIsSpoiler(e.target.checked)}
                />
              }
              label="Contains spoilers"
            />

            {!existingReview && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Who can see this review?
                </Typography>
                <Select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  fullWidth
                  size="small"
                  inputProps={{ "aria-label": "Visibility" }}
                >
                  <MenuItem value="GLOBAL">PlexFlip Community (Public)</MenuItem>
                  <MenuItem value="LOCAL">This Plex Server Only</MenuItem>
                </Select>
              </Box>
            )}

            <Divider sx={{ my: 1 }} />

            <Stack
              direction="row"
              justifyContent={existingReview ? "space-between" : "flex-end"}
              alignItems="center"
            >
              {existingReview && (
                <Button
                  variant="outlined"
                  onClick={handleDelete}
                  color="error"
                  disabled={isLoading}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Delete
                </Button>
              )}

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  onClick={onClose}
                  disabled={isLoading}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={isLoading || reviewText.length > 500}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  {existingReview ? "Update Review" : "Save Review"}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        )}
      </Box>
    </Modal>
  );
}

export default AddReviewModal;

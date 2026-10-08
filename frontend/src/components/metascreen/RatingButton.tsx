import React, { JSX, useEffect, useState } from "react";
import { Button, Popover, Rating, Tooltip } from "@mui/material";
import {
  RateReviewRounded,
  StarOutlineRounded,
  StarRounded,
} from "@mui/icons-material";
import { setMediaRating } from "../../plex";
import AddReviewModal from "../modals/AddReviewModal";

export interface RatingButtonProps {
  item: Plex.Metadata;
}

export function RatingButton({ item }: RatingButtonProps): JSX.Element {
  const [rating, setRating] = useState<number | null>(
    (item.userRating && item.userRating / 2) ?? null
  );

  const [addReviewModalOpen, setAddReviewModalOpen] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    setRating((item.userRating && item.userRating / 2) ?? null);
  }, [item, item.userRating]);

  return (
    <>
      {addReviewModalOpen && item && (
        <AddReviewModal
          item={item}
          initialRating={rating !== null ? rating : undefined}
          onClose={() => setAddReviewModalOpen(false)}
          onSuccess={() => {
            if (item.userRating) {
              setRating(item.userRating / 2);
            }
          }}
        />
      )}
      <Popover
        anchorEl={anchorEl}
        open={anchorEl !== null}
        onClose={() => setAnchorEl(null)}
        onClick={() => {
          setAnchorEl(null);
        }}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        sx={{
          "& .MuiPopover-paper": {
            padding: 1.5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
            backgroundColor: (theme) => theme.palette.background.paper,
            borderRadius: 2,
            boxShadow: 6,
          },
        }}
      >
        <Rating
          name="simple-controlled"
          value={rating}
          precision={0.5}
          size="large"
          onChange={(e, v) => {
            setRating(v);

            if (v === null) return;

            item.userRating = v * 2;
            item.rating = v * 2;
            if (item.ratingKey && /^\d+$/.test(item.ratingKey)) {
              setMediaRating(v * 2, item.ratingKey).catch(() => {});
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setRating(null);
            item.userRating = undefined;
            item.rating = undefined;
            if (item.ratingKey && /^\d+$/.test(item.ratingKey)) {
              setMediaRating(-1, item.ratingKey).catch(() => {});
            }
          }}
        />

        <Button
          variant="contained"
          size="small"
          startIcon={<RateReviewRounded fontSize="small" />}
          onClick={(e) => {
            e.stopPropagation();
            setAddReviewModalOpen(true);
            setAnchorEl(null);
          }}
          sx={{
            width: "100%",
            borderRadius: 1.5,
            textTransform: "none",
            fontWeight: "bold",
            bgcolor: (theme) => theme.palette.primary.main,
            color: "#000",
            "&:hover": {
              bgcolor: (theme) => theme.palette.primary.dark,
            },
          }}
        >
          {rating ? "Write / Edit Review" : "Write Review"}
        </Button>
      </Popover>
      <Tooltip title="Rate & Review" arrow placement="top">
        <Button
          variant="contained"
          sx={{
            height: "38px",
            fontWeight: "bold",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            transition: "all 0.2s ease-in-out",
            display: "flex",
            gap: 1,
          }}
          onClick={(e) => {
            setAnchorEl(e.currentTarget);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setRating(null);
            item.userRating = undefined;
            item.rating = undefined;
            if (item.ratingKey && /^\d+$/.test(item.ratingKey)) {
              setMediaRating(-1, item.ratingKey).catch(() => {});
            }
          }}
        >
          {rating ? (
            <StarRounded fontSize="small" />
          ) : (
            <StarOutlineRounded fontSize="small" />
          )}
        </Button>
      </Tooltip>
    </>
  );
}

export default RatingButton;

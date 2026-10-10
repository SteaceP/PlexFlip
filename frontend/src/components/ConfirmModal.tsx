import { Box, Button, Fade, Modal, Paper, Typography } from "@mui/material";

import { useConfirmModal } from "../states/ConfirmModalState";

function ConfirmModal() {
  const { open, title, message, onConfirm, onCancel } = useConfirmModal();

  const handleConfirm = () => {
    onConfirm();
    useConfirmModal.setState({ open: false });
  };

  const handleCancel = () => {
    onCancel();
    useConfirmModal.setState({ open: false });
  };

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      closeAfterTransition
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-description"
    >
      <Fade in={open}>
        <Paper
          elevation={3}
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "85%", sm: 400 },
            maxWidth: 450,
            borderRadius: 2,
            p: 3,
            outline: "none",
          }}
        >
          <Typography
            id="confirm-modal-title"
            variant="h6"
            component="h2"
            sx={{
              mb: 2,
              fontWeight: 500,
              color: "text.primary",
            }}
          >
            {title}
          </Typography>

          <Typography
            id="confirm-modal-description"
            variant="body1"
            sx={{
              mb: 3,
              color: "text.secondary",
            }}
          >
            {message}
          </Typography>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
            }}
          >
            <Button
              variant="outlined"
              onClick={handleCancel}
              size="medium"
              sx={{
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={handleConfirm}
              disableElevation
              size="medium"
              sx={{
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              Confirm
            </Button>
          </Box>
        </Paper>
      </Fade>
    </Modal>
  );
}

export default ConfirmModal;

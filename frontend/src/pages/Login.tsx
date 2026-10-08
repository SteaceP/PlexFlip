import React, { useState } from "react";
import {
  Alert,
  Box,
  Card,
  Collapse,
  IconButton,
  Stack,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  AuthSuccessCard,
  EmailLoginForm,
  LoginConnecting,
  LoginHeader,
  LoginWaitingStatus,
  PinCodeCard,
  SocialLoginButtons,
  usePlexAuth,
} from "../components/login";

export default function Login() {
  const [showEmailForm, setShowEmailForm] = useState<boolean>(false);

  const {
    error,
    infoMessage,
    setInfoMessage,
    pinData,
    copied,
    browserOpened,
    isCompleting,
    browserCallbackComplete,
    completeLogin,
    createPinAndStartPolling,
    handleCopyCode,
    handleQuickLink,
    handleGoogleSignIn,
    handleAppleSignIn,
  } = usePlexAuth();

  // If this tab was the browser window completing auth:
  if (browserCallbackComplete) {
    return <AuthSuccessCard />;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 50% 10%, #1e1b4b 0%, #030712 100%)",
        p: { xs: 2, sm: 3 },
      }}
    >
      <Card
        sx={{
          maxWidth: 460,
          width: "100%",
          p: { xs: 3, sm: 4.5 },
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(24px)",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.15)",
        }}
      >
        <LoginHeader />

        <Collapse in={Boolean(infoMessage)}>
          <Alert
            severity="info"
            onClose={() => setInfoMessage(null)}
            sx={{
              mb: 2.5,
              borderRadius: "12px",
              background: "rgba(59, 130, 246, 0.15)",
              color: "#93C5FD",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              fontSize: "0.88rem",
            }}
          >
            {infoMessage}
          </Alert>
        </Collapse>

        <Collapse in={Boolean(error)}>
          <Alert
            severity="error"
            action={
              <IconButton size="small" color="inherit" onClick={createPinAndStartPolling}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            }
            sx={{ mb: 2.5, borderRadius: "12px", background: "rgba(239, 68, 68, 0.12)", color: "#FCA5A5" }}
          >
            {error}
          </Alert>
        </Collapse>

        {isCompleting ? (
          <LoginConnecting />
        ) : showEmailForm ? (
          <EmailLoginForm
            onSuccess={completeLogin}
            onCancel={() => setShowEmailForm(false)}
          />
        ) : (
          <Stack spacing={2}>
            <PinCodeCard
              code={pinData?.code}
              copied={copied}
              onCopy={handleCopyCode}
              onQuickLink={handleQuickLink}
            />

            <SocialLoginButtons
              hasCode={Boolean(pinData?.code)}
              onEmailClick={() => setShowEmailForm(true)}
              onGoogleClick={handleGoogleSignIn}
              onAppleClick={handleAppleSignIn}
            />

            <LoginWaitingStatus browserOpened={browserOpened} />
          </Stack>
        )}
      </Card>
    </Box>
  );
}

import React from "react";
import { Box, Stack } from "@mui/material";
import { motion } from "framer-motion";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import CheckBoxOption from "../../components/settings/CheckBoxOption";
import SettingsCard from "../../components/settings/SettingsCard";
import SettingsHeader from "../../components/settings/SettingsHeader";
import { useUserSettings } from "../../states/UserSettingsState";

function _template() {
  const { settings, setSetting } = useUserSettings();
  const isEnabled = settings["TEMPLATE_OPTION"] === "true";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ width: "100%" }}
    >
      <SettingsHeader
        category="Category"
        title="Template Section"
        subtitle="Description for this settings group."
      />

      <Stack spacing={3} sx={{ width: "100%" }}>
        <SettingsCard
          title="Section Group"
          subtitle="Group description and details"
          icon={<TuneRoundedIcon fontSize="small" />}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <CheckBoxOption
              icon={<TuneRoundedIcon fontSize="small" />}
              title="Template Setting"
              subtitle="Description of what this setting controls."
              checked={isEnabled}
              onChange={() => {
                setSetting("TEMPLATE_OPTION", isEnabled ? "false" : "true");
              }}
            />
          </Box>
        </SettingsCard>
      </Stack>
    </motion.div>
  );
}

export default _template;

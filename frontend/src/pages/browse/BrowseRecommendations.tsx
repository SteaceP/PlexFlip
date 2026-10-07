import { Box, CircularProgress, Typography } from "@mui/material";
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import HeroDisplay from "../../components/HeroDisplay";
import MovieItemSlider, {
  shuffleArray,
} from "../../components/MovieItemSlider";
import { getLibrary, getLibraryDir, getLibraryMeta } from "../../plex";
import { getIncludeProps } from "../../plex/QuickFunctions";
import { motion } from "framer-motion";
import { useUserSettings } from "../../states/UserSettingsState";

interface Category {
  title: string;
  dir: string;
  props?: { [key: string]: any };
  filter?: (item: Plex.Metadata) => boolean;
  link: string;
  shuffle?: boolean;
}

function BrowseRecommendations() {
  const { libraryID } = useParams<{ libraryID: string }>();
  const [library, setLibrary] = React.useState<Plex.MediaContainer | null>(
    null
  );
  const [featuredItem, setFeaturedItem] = React.useState<Plex.Metadata | null>(
    null
  );
  const [categories, setCategories] = React.useState<Category[] | null>([]);
  const [loading, setLoading] = React.useState(true);
  const { settings } = useUserSettings();

  const showHero = settings["DISABLE_HERO_DISPLAY"] !== "true";

  useEffect(() => {
    if (!libraryID) return;
    getLibrary(libraryID).then((data) => {
      setLibrary(data);
    });
  }, [libraryID]);

  useEffect(() => {
    setFeaturedItem(null);
    setCategories([]);

    if (!library) return;
    setLoading(true);

    const fetchHero = async () => {
      if (!showHero) return;
      try {
        const media = await getLibraryDir(
          `/library/sections/${library.librarySectionID.toString()}/unwatched`
        );
        const data = media.Metadata;
        if (!data || data.length === 0) return;
        const item = data[Math.floor(Math.random() * data.length)];
        const meta = await getLibraryMeta(item.ratingKey);
        setFeaturedItem(meta);
      } catch (err) {
        console.error("Error fetching featured hero item", err);
      }
    };

    const fetchCategories = async () => {
      let categoryPool: Category[] = [];

      const getGenres = new Promise<Category[]>((resolve) => {
        if (settings["DISABLE_GENRE_RECOMMENDATIONS"] === "true") {
          return resolve([]);
        }
        getLibraryDir(
          `/library/sections/${library.librarySectionID.toString()}/genre`
        )
          .then(async (media) => {
            const genres = media.Directory;
            if (!genres || !genres.length) return resolve([]);
            const genreSelection: Plex.Directory[] = [];

            // Get up to 8 random genres
            while (genreSelection.length < Math.min(8, genres.length)) {
              const genre = genres[Math.floor(Math.random() * genres.length)];
              if (genreSelection.includes(genre)) continue;
              genreSelection.push(genre);
            }

            resolve(
              shuffleArray(genreSelection).map((genre) => ({
                title: genre.title,
                dir: `/library/sections/${library.librarySectionID}/genre/${genre.key}`,
                link: `/library/sections/${library.librarySectionID}/genre/${genre.key}`,
                shuffle: true,
              }))
            );
          })
          .catch(() => resolve([]));
      });

      const getLastViewed = new Promise<Plex.Metadata[]>((resolve) => {
        if (settings["DISABLE_SIMILAR_RECOMMENDATIONS"] === "true") {
          return resolve([]);
        }
        getLibraryDir(
          `/library/sections/${library.librarySectionID.toString()}/all`,
          {
            type: library.Type?.[0].type === "movie" ? "1" : "2",
            sort: "lastViewedAt:desc",
            limit: "20",
            unwatched: "0",
          }
        )
          .then(async (media) => {
            let data = media.Metadata;
            if (!data) return resolve([]);
            resolve(data.filter((item) => ["movie", "show"].includes(item.type)));
          })
          .catch(() => resolve([]));
      });

      try {
        const [genres, lastViewed] = await Promise.all([
          getGenres,
          getLastViewed,
        ]);

        if (settings["DISABLE_SIMILAR_RECOMMENDATIONS"] !== "true") {
          if (lastViewed[0]) {
            const lastViewItem = await getLibraryMeta(lastViewed[0].ratingKey);

            if (lastViewItem?.Related?.Hub?.[0]?.Metadata?.[0]) {
              let shortenedTitle = lastViewItem.title;
              if (shortenedTitle.length > 40)
                shortenedTitle = `${shortenedTitle.slice(0, 40)}...`;

              categoryPool.push({
                title: `Because you watched ${shortenedTitle}`,
                dir: lastViewItem.Related.Hub[0].hubKey,
                link: lastViewItem.Related.Hub[0].key,
                shuffle: true,
              });
            }
          }

          if (lastViewed.length > 3) {
            const randomItem =
              lastViewed[Math.floor(Math.random() * lastViewed.length)];
            const randomMeta = await getLibraryMeta(randomItem.ratingKey);

            let shortenedTitle = randomMeta.title;
            if (shortenedTitle.length > 40)
              shortenedTitle = `${shortenedTitle.slice(0, 40)}...`;

            if (randomMeta?.Related?.Hub?.[0]?.Metadata?.[0]) {
              categoryPool.push({
                title: `More Like ${shortenedTitle}`,
                dir: randomMeta.Related.Hub[0].hubKey,
                link: randomMeta.Related.Hub[0].key,
                shuffle: true,
              });
            }
          }
        }

        if (settings["DISABLE_RECENTLY_ADDED"] !== "true") {
          if (library.Type?.[0].type === "show") {
            categoryPool.push({
              title: "Recently Added",
              dir: `/hubs/home/recentlyAdded`,
              link: ``,
              props: {
                type: "2",
                limit: "30",
                sectionID: library.librarySectionID,
                contentSectionID: library.librarySectionID,
                ...getIncludeProps(),
              },
              filter: (item) => item.type === "show",
            });
          }
        }

        categoryPool = shuffleArray([...genres, ...categoryPool]);

        if (settings["DISABLE_RECENTLY_ADDED"] !== "true") {
          if (library.Type?.[0].type === "movie") {
            categoryPool.unshift({
              title: "Recently Added",
              dir: `/library/sections/${library.librarySectionID}/recentlyAdded`,
              link: `/library/sections/${library.librarySectionID}/recentlyAdded`,
            });
            categoryPool.unshift({
              title: "New Releases",
              dir: `/library/sections/${library.librarySectionID}/newest`,
              link: `/library/sections/${library.librarySectionID}/newest`,
            });
          }
        }

        if (settings["DISABLE_CONTINUE_WATCHING"] !== "true") {
          categoryPool.unshift({
            title: "Continue Watching",
            dir: `/library/sections/${library.librarySectionID}/onDeck`,
            link: `/library/sections/${library.librarySectionID}/onDeck`,
            shuffle: false,
          });
        }

        setCategories(categoryPool);
      } catch (err) {
        console.error("Error setting categories", err);
      } finally {
        setLoading(false);
      }
    };

    Promise.all([fetchHero(), fetchCategories()]);
  }, [library, settings, showHero]);

  if (loading || !library)
    return (
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        sx={{
          width: "100vw",
          height: "80vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      sx={{
        width: "100%",
        height: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        pb: 8,
      }}
    >
      {showHero && featuredItem && <HeroDisplay item={featuredItem} />}
      <Box
        sx={{
          zIndex: 1,
          mt: showHero && featuredItem ? "-20vh" : "80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          gap: 8,
          width: "100%",
        }}
      >
        {categories && categories.length > 0 ? (
          categories.map((category, index) => (
            <MovieItemSlider
              key={index}
              title={category.title}
              dir={category.dir}
              props={category.props}
              filter={category.filter}
              link={category.link}
              shuffle={category.shuffle}
            />
          ))
        ) : (
          <Box
            sx={{
              p: 6,
              width: "100%",
              textAlign: "center",
              color: "text.secondary",
            }}
          >
            <Typography variant="h6">
              No recommendations enabled or available for this library.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default BrowseRecommendations;

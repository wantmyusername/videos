// ... imports ...

app.post("/render", async (req, res) => {
  try {
    const inputProps = req.body;
    console.log("📜 Generando frase...");

    // DURACIÓN FIJA: 12 SEGUNDOS
    const FPS = 30;
    const durationInFrames = 12 * FPS;

    if (!bundledPath) {
      bundledPath = await bundle({
        entryPoint: path.join(process.cwd(), "src", "index.ts"),
      });
    }

    const composition = await selectComposition({
      serveUrl: bundledPath,
      id: "QuoteVideo", // ID ACTUALIZADO
      inputProps,
    });

    const tempOutput = path.join(os.tmpdir(), `quote-${Date.now()}.mp4`);

    await renderMedia({
      composition,
      serveUrl: bundledPath,
      codec: "h264",
      outputLocation: tempOutput,
      inputProps,
      durationInFrames,
    });

    res.download(tempOutput, (err) => {
      if (err) console.error(err);
      try { if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput); } catch(e){}
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
});
// ...

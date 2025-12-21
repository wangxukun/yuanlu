-- AddForeignKey
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_episodeid_fkey" FOREIGN KEY ("episodeid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

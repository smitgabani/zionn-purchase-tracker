-- Add missing DELETE policy for card_shifts table
CREATE POLICY "Users can delete their own card shifts"
  ON card_shifts FOR DELETE
  USING (
    card_id IN (
      SELECT id FROM cards WHERE admin_user_id = auth.uid()
    )
  );

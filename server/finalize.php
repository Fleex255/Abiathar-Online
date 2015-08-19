<?
	/* A URL of this page is given to Dropbox to
	 * fetch a GAMEMAPS file. Entries are loaded
	 * into files by load.php from JavaScript. */
	 
	 // Get the data out
	 $id = "OpenThar_" . $_GET["id"] . ".dat";
	 $file = fopen($id, "rb");
	 $binaryVal = fread($file, filesize($id));
	 fclose($file);
	 
	 // Explain to Dropbox that this is a binary file
	 header("Content-Type: application/octet-stream");
	 header("Content-Disposition: attachment; filename='GAMEMAPS.DAT'");
	 header("Expires: 0");
	 header("Pragma: public");
	 header("Content-Length: " . strlen($binaryVal));
	 
	 // Send it down
	 echo $binaryVal;
	 
	 // Purge from disk
	 unlink($id);
	 
	 // Suppress the analytics script
	 exit;
?>
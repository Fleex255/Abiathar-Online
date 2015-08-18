<?php
	/* I really, really wish this didn't have to exist.
	 * Basically, the Dropbox Saver doesn't support data URLs,
	 * so I need to give it a real URL so people can save their levels.
	 * Since I'm not going to spend any money on this,
	 * and the only freely hosted language (essentially) is PHP,
	 * I'm stuck with PHP. Gross. */
	 
	 // Decode the data
	 $binaryVal = base64_decode($_GET["data"], true);
	 if ($binaryVal === false) exit;
	 
	 // Explain to the client that this is a binary file
	 header("Content-Type: application/octet-stream");
	 header("Content-Disposition: attachment; filename='" . $_GET["filename"] . "'");
	 header("Expires: 0");
	 header("Pragma: public");
	 header("Content-Length: " . strlen($binaryVal));
	 
	 // Dump it on 'em
	 echo $binaryVal;
	 
	 // Suppress the analytics script injected by this hosting provider
	 // It's not malicious, but it will create problems in MAPHEADs
	 // Hooray for free hosting!
	 exit;
?>